/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { SignificantEventsServer } from '../../../types';
import { internalCostRoutes } from './route';

const mockAssertGlobal = jest.fn();
const mockCreateAccess = jest.fn().mockReturnValue({ access: true });
const mockCreateAuditRepository = jest.fn().mockReturnValue({ repository: true });
const mockSetTracking = jest.fn();

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/run_quotas/privileges', () => ({
  assertCanManageSignificantEventsGlobally: (...args: unknown[]) => mockAssertGlobal(...args),
}));

jest.mock('../../../lib/cost/space_coverage', () => ({
  createSpaceTrackingAccess: (...args: unknown[]) => mockCreateAccess(...args),
  createCostTrackingAuditRepository: (...args: unknown[]) => mockCreateAuditRepository(...args),
  setTokenUsageTrackingInAllSpaces: (...args: unknown[]) => mockSetTracking(...args),
}));

const getRoute = internalCostRoutes['GET /internal/significant_events/cost'];
const putTrackingRoute =
  internalCostRoutes['PUT /internal/significant_events/cost/token_usage_tracking'];

const createHandlerParams = () => {
  const getCost = jest.fn().mockResolvedValue({ asOf: '2026-08-31T12:00:00.000Z' });
  const invalidate = jest.fn();
  const request = {};
  const server = {
    core: {
      security: {
        authc: {
          getCurrentUser: jest.fn().mockReturnValue({ username: 'elastic' }),
        },
      },
    },
  } as unknown as SignificantEventsServer;
  return {
    request,
    server,
    getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
    getSpaceId: jest.fn().mockResolvedValue('space-a'),
    costService: { getCost, invalidate },
    logger: { warn: jest.fn() },
    getCost,
    invalidate,
  };
};

describe('cost routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertGlobal.mockResolvedValue(undefined);
  });

  it.each([getRoute, putTrackingRoute])(
    'declares Streams manage and the deployment-wide authorization check',
    (route) => {
      expect(route.security.authz).toEqual({
        requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
      });
    }
  );

  it('loads the current-space-gated cost only after the global check', async () => {
    const params = createHandlerParams();

    await expect(getRoute.handler(params as never)).resolves.toEqual({
      asOf: '2026-08-31T12:00:00.000Z',
    });

    expect(mockAssertGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        request: params.request,
        server: params.server,
      })
    );
    expect(params.getCost).toHaveBeenCalledWith({
      request: params.request,
      server: params.server,
      currentSpaceId: 'space-a',
    });
  });

  it('writes token tracking in all spaces, records the actor, and invalidates cost cache', async () => {
    const params = createHandlerParams();
    mockSetTracking.mockResolvedValue({
      enabled: true,
      updatedSpaceIds: ['default', 'space-a'],
      failedSpaces: [],
    });

    await expect(
      putTrackingRoute.handler({
        ...params,
        params: { body: { enabled: true } },
      } as never)
    ).resolves.toEqual({
      enabled: true,
      updatedSpaceIds: ['default', 'space-a'],
      failedSpaces: [],
    });

    expect(mockSetTracking).toHaveBeenCalledWith({
      access: { access: true },
      auditRepository: { repository: true },
      enabled: true,
      changedBy: 'elastic',
    });
    expect(params.invalidate).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached coverage when the tracking write fails', async () => {
    const params = createHandlerParams();
    mockSetTracking.mockRejectedValue(new Error('audit write failed'));

    await expect(
      putTrackingRoute.handler({
        ...params,
        params: { body: { enabled: false } },
      } as never)
    ).rejects.toThrow('audit write failed');

    expect(params.invalidate).toHaveBeenCalledTimes(1);
  });

  it('does not perform work when the all-spaces check fails', async () => {
    const params = createHandlerParams();
    mockAssertGlobal.mockRejectedValue(new Error('forbidden'));

    await expect(getRoute.handler(params as never)).rejects.toThrow('forbidden');
    expect(params.getCost).not.toHaveBeenCalled();
  });
});
