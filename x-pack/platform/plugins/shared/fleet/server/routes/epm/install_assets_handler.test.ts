/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { FleetRequestHandlerContext } from '../..';
import { xpackMocks } from '../../mocks';
import { appContextService } from '../../services';
import { FleetUnauthorizedError } from '../../errors';
import {
  getInstallationObject,
  getInstalledPackageWithAssets,
} from '../../services/epm/packages/get';
import { getWorkflowAssetsClient } from '../../services/epm/kibana/workflows/availability';
import { checkWorkflowAssetPrivilegesForSpaces } from '../../services/epm/packages/upload_preflight_authz';
import { stepInstallWorkflows } from '../../services/epm/packages/install_state_machine/steps/step_install_workflows';

import { installPackageKibanaAssetsHandler } from './install_assets_handler';

jest.mock('../../services/epm/packages/get');
jest.mock('../../services/epm/kibana/assets/install');
jest.mock('../../services/epm/kibana/workflows/availability');
jest.mock('../../services/epm/packages/upload_preflight_authz');
jest.mock('../../services/epm/packages/install_state_machine/steps/step_install_workflows');
jest.mock('../../services/epm/packages/install_state_machine/steps/step_create_alerting_assets');
jest.mock('../../services/epm/archive/archive_iterator');

const WORKFLOW_PATH = 'mypkg-1.0.0/kibana/workflow/mypkg-my_workflow.yml';
const DASHBOARD_PATH = 'mypkg-1.0.0/kibana/dashboard/my_dashboard.json';

const setupInstallation = ({
  installSource,
  paths,
  installedKibana = [],
}: {
  installSource: 'upload' | 'registry';
  paths: string[];
  installedKibana?: Array<{ id: string; type: string }>;
}) => {
  const installation = {
    id: 'mypkg',
    attributes: {
      version: '1.0.0',
      install_source: installSource,
      installed_kibana_space_id: 'default',
      installed_kibana: installedKibana,
    },
  };
  jest.mocked(getInstallationObject).mockResolvedValue(installation as any);
  jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
    installation: { version: '1.0.0' },
    packageInfo: { name: 'mypkg', title: 'My package' },
    paths,
    assetsMap: new Map(),
  } as any);
};

describe('installPackageKibanaAssetsHandler workflow authorization', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  const callHandler = (spaceIds?: string[]) =>
    installPackageKibanaAssetsHandler(
      context,
      httpServerMock.createKibanaRequest({
        params: { pkgName: 'mypkg', pkgVersion: '1.0.0' },
        body: spaceIds ? { space_ids: spaceIds } : undefined,
      }) as any,
      response
    );

  beforeEach(() => {
    jest.resetAllMocks();
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    appContextService.getLogger = () => loggerMock.create();
    appContextService.getInternalUserSOClientForSpaceId = jest.fn();
    appContextService.getSecurity = jest.fn().mockReturnValue({
      authz: {
        actions: { api: { get: (name: string) => `api:${name}` } },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({
          atSpaces: jest.fn().mockResolvedValue({ hasAllRequested: true }),
        }),
      },
    });
    jest.mocked(getWorkflowAssetsClient).mockResolvedValue({} as any);
  });

  it('checks workflow privileges in every requested space for uploaded packages with workflows', async () => {
    setupInstallation({ installSource: 'upload', paths: [WORKFLOW_PATH] });

    await callHandler(['default', 'other']);

    expect(checkWorkflowAssetPrivilegesForSpaces).toHaveBeenCalledWith(expect.anything(), [
      'default',
      'other',
    ]);
    expect(stepInstallWorkflows).toHaveBeenCalledTimes(2);
  });

  it('checks workflow privileges when the uploaded package only has installed workflow refs', async () => {
    setupInstallation({
      installSource: 'upload',
      paths: [DASHBOARD_PATH],
      installedKibana: [{ id: 'wf-1', type: 'workflow' }],
    });

    await callHandler(['default']);

    expect(checkWorkflowAssetPrivilegesForSpaces).toHaveBeenCalledWith(expect.anything(), [
      'default',
    ]);
  });

  it('fails closed without installing workflows when the caller lacks workflow privileges', async () => {
    setupInstallation({ installSource: 'upload', paths: [WORKFLOW_PATH] });
    jest
      .mocked(checkWorkflowAssetPrivilegesForSpaces)
      .mockRejectedValue(new FleetUnauthorizedError('Insufficient privileges'));

    await expect(callHandler(['other'])).rejects.toBeInstanceOf(FleetUnauthorizedError);
    expect(stepInstallWorkflows).not.toHaveBeenCalled();
  });

  it('does not check workflow privileges for registry packages', async () => {
    setupInstallation({ installSource: 'registry', paths: [WORKFLOW_PATH] });

    await callHandler(['other']);

    expect(checkWorkflowAssetPrivilegesForSpaces).not.toHaveBeenCalled();
    expect(stepInstallWorkflows).toHaveBeenCalledTimes(1);
  });

  it('does not check workflow privileges when the uploaded package has no workflows', async () => {
    setupInstallation({ installSource: 'upload', paths: [DASHBOARD_PATH] });

    await callHandler(['other']);

    expect(checkWorkflowAssetPrivilegesForSpaces).not.toHaveBeenCalled();
  });

  it('does not check workflow privileges when workflow assets are unavailable', async () => {
    setupInstallation({ installSource: 'upload', paths: [WORKFLOW_PATH] });
    jest.mocked(getWorkflowAssetsClient).mockResolvedValue(undefined);

    await callHandler(['other']);

    expect(checkWorkflowAssetPrivilegesForSpaces).not.toHaveBeenCalled();
  });
});
