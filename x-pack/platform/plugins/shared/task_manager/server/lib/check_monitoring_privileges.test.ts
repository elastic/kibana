/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import {
  checkMonitoringPrivileges,
  MANAGE_TASK_MANAGER_API_PRIVILEGE,
} from './check_monitoring_privileges';
import { createEsResponseError } from '../test_utils';

const createHasPrivilegesResponse = ({
  monitor,
  manageTaskManager,
}: {
  monitor: boolean;
  manageTaskManager: boolean;
}): SecurityHasPrivilegesResponse => ({
  username: 'user',
  has_all_requested: monitor && manageTaskManager,
  cluster: { monitor },
  index: {},
  application: {
    'kibana-.kibana': { '*': { [MANAGE_TASK_MANAGER_API_PRIVILEGE]: manageTaskManager } },
  },
});

const setup = ({
  getIsSecurityEnabled = () => true,
}: { getIsSecurityEnabled?: () => boolean } = {}) => {
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  clusterClient.asScoped.mockReturnValue(scopedClusterClient);
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();

  return {
    hasPrivileges: scopedClusterClient.asCurrentUser.security.hasPrivileges,
    logger,
    check: () =>
      checkMonitoringPrivileges({
        request,
        getClusterClient: () => Promise.resolve(clusterClient),
        kibanaIndexName: '.kibana',
        getIsSecurityEnabled,
        logger,
      }),
    clusterClient,
    request,
  };
};

describe('checkMonitoringPrivileges', () => {
  it('checks the cluster monitor and Kibana manage_taskManager privileges of the current user', async () => {
    const { hasPrivileges, check, clusterClient, request } = setup();
    hasPrivileges.mockResponse(
      createHasPrivilegesResponse({ monitor: false, manageTaskManager: false })
    );

    await check();

    expect(clusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(hasPrivileges).toHaveBeenCalledWith({
      cluster: ['monitor'],
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['*'],
          privileges: ['api:manage_taskManager'],
        },
      ],
    });
  });

  it.each([
    { monitor: true, manageTaskManager: true, isPrivileged: true },
    { monitor: true, manageTaskManager: false, isPrivileged: true },
    { monitor: false, manageTaskManager: true, isPrivileged: true },
    { monitor: false, manageTaskManager: false, isPrivileged: false },
  ])(
    'returns isPrivileged: $isPrivileged when monitor is $monitor and manage_taskManager is $manageTaskManager',
    async ({ monitor, manageTaskManager, isPrivileged }) => {
      const { hasPrivileges, check } = setup();
      hasPrivileges.mockResponse(createHasPrivilegesResponse({ monitor, manageTaskManager }));

      expect(await check()).toEqual({ isPrivileged, hasManageTaskManager: manageTaskManager });
    }
  );

  it('treats the caller as privileged without checking privileges when security is disabled', async () => {
    const { hasPrivileges, check } = setup({ getIsSecurityEnabled: () => false });

    expect(await check()).toEqual({ isPrivileged: true, hasManageTaskManager: true });
    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('treats the caller as privileged when Elasticsearch reports security is disabled', async () => {
    const { hasPrivileges, check, logger } = setup();
    hasPrivileges.mockRejectedValue(
      new errors.ResponseError(
        elasticsearchServiceMock.createApiResponse({
          statusCode: 400,
          body: {
            error: 'no handler found for uri [/_security/user/_has_privileges] and method [POST]',
          },
        })
      )
    );

    expect(await check()).toEqual({ isPrivileged: true, hasManageTaskManager: true });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('treats the caller as privileged when security is reported disabled after the check fails', async () => {
    const getIsSecurityEnabled = jest.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const { hasPrivileges, check } = setup({ getIsSecurityEnabled });
    hasPrivileges.mockRejectedValue(createEsResponseError(500));

    expect(await check()).toEqual({ isPrivileged: true, hasManageTaskManager: true });
  });

  it.each([
    ['an unrelated 400 error', createEsResponseError(400, 'illegal_argument_exception')],
    ['a 500 error', createEsResponseError(500)],
    ['a non Elasticsearch error', new Error('boom')],
  ])('treats the caller as unprivileged and logs a warning on %s', async (_, error) => {
    const { hasPrivileges, check, logger } = setup();
    hasPrivileges.mockRejectedValue(error);

    expect(await check()).toEqual({ isPrivileged: false, hasManageTaskManager: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to check Task Manager monitoring privileges')
    );
  });
});
