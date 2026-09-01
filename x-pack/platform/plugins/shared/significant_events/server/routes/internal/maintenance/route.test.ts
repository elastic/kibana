/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { internalMaintenanceRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalMaintenanceRoutes['POST /internal/significant_events/maintenance/cleanup/_bootstrap'];
type HandlerParams = Parameters<typeof route.handler>[0];

describe('cleanup workflow bootstrap route', () => {
  beforeEach(() => jest.clearAllMocks());

  const createHandlerParams = (ensureEnabled = jest.fn().mockResolvedValue(undefined)) => {
    const request = {};
    const licensing = {};
    const server = {};
    const logger = { warn: jest.fn() };
    const maintenanceService = { getState: jest.fn().mockResolvedValue('enabled') };
    const getSpaceId = jest.fn().mockResolvedValue('space-a');

    return {
      request,
      licensing,
      server,
      logger,
      ensureEnabled,
      handlerParams: {
        request,
        server,
        logger,
        maintenanceService,
        getSpaceId,
        cleanupWorkflowService: { ensureEnabled },
        getScopedClients: jest.fn().mockResolvedValue({ licensing }),
      } as unknown as HandlerParams,
    };
  };

  it('requires streams manage and enables cleanup in the current space', async () => {
    const params = createHandlerParams();

    await expect(route.handler(params.handlerParams)).resolves.toEqual({ success: true });

    expect(route.security.authz).toEqual({
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    });
    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({
      server: params.server,
      licensing: params.licensing,
    });
    expect(params.ensureEnabled).toHaveBeenCalledWith({
      request: params.request,
      spaceId: 'space-a',
    });
  });

  it('returns success when cleanup enablement fails', async () => {
    const params = createHandlerParams(
      jest.fn().mockRejectedValue(new Error('workflow unavailable'))
    );

    await expect(route.handler(params.handlerParams)).resolves.toEqual({ success: true });

    expect(params.logger.warn).toHaveBeenCalledWith(
      'Failed to ensure Significant Events cleanup workflow is enabled: workflow unavailable'
    );
  });
});
