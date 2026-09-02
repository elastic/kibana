/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsServer } from '../../../types';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createInMemoryRunQuotaRepository } from '../../../lib/run_quotas/in_memory_repository.test_utils';
import {
  getRunQuotaLedgerId,
  mutateRunQuotaSettings,
  readRunQuotaSettings,
} from '../../../lib/run_quotas/repository';
import { RUN_QUOTA_LEDGER_SO_TYPE } from '../../../lib/run_quotas/saved_objects';
import { internalRunQuotaRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const getRoute = internalRunQuotaRoutes['GET /internal/significant_events/run_quotas'];
const putRoute = internalRunQuotaRoutes['PUT /internal/significant_events/run_quotas'];
const enforcementRoute =
  internalRunQuotaRoutes['POST /internal/significant_events/run_quotas/_enforcement'];
const consumeRoute =
  internalRunQuotaRoutes['POST /internal/significant_events/run_quotas/_consume'];
const reserveRoute =
  internalRunQuotaRoutes['POST /internal/significant_events/run_quotas/investigation/_reserve'];
const statusRoute = internalRunQuotaRoutes['GET /internal/significant_events/run_quotas/_status'];

const makeServer = ({
  repository,
  canManage,
  displayCount = 0,
  displayCountError,
}: {
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>['client'];
  canManage: boolean;
  displayCount?: number;
  displayCountError?: Error;
}) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested: canManage });
  const count = displayCountError
    ? jest.fn().mockRejectedValue(displayCountError)
    : jest.fn().mockResolvedValue({ count: displayCount });
  return {
    server: {
      core: {
        elasticsearch: {
          client: {
            asInternalUser: {
              count,
            },
          },
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(repository),
        },
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ username: 'elastic' }),
          },
        },
      },
      security: {
        authz: {
          actions: { api: { get: jest.fn((privilege) => `api:${privilege}`) } },
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
        },
      },
    } as unknown as SignificantEventsServer,
  };
};

const baseHandlerParams = (server: SignificantEventsServer) => ({
  request: {},
  server,
  getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
  getSpaceId: jest.fn().mockResolvedValue('space-a'),
  logger: { warn: jest.fn() },
});

describe('run quota route authorization matrix', () => {
  it.each([
    ['read quotas', getRoute, STREAMS_API_PRIVILEGES.read],
    ['update quotas', putRoute, STREAMS_API_PRIVILEGES.manage],
    ['toggle enforcement', enforcementRoute, STREAMS_API_PRIVILEGES.manage],
    ['consume worker quota', consumeRoute, STREAMS_API_PRIVILEGES.manage],
    ['reserve investigation quota', reserveRoute, STREAMS_API_PRIVILEGES.manage],
    ['read enforcement status', statusRoute, STREAMS_API_PRIVILEGES.read],
  ])('%s declares the required Streams privilege', (_, route, requiredPrivilege) => {
    expect(route.security.authz).toEqual({
      requiredPrivileges: [requiredPrivilege],
    });
  });
});

describe('run quota route schemas', () => {
  it('accepts the canonical unlimited value', () => {
    expect(
      putRoute.params.safeParse({
        body: { limits: { detection: { enabled: false, max: 0 } } },
      }).success
    ).toBe(true);
  });

  it('rejects malformed limits and unbounded plumbing identifiers', () => {
    expect(
      putRoute.params.safeParse({
        body: { limits: { detection: { enabled: false, max: 1 } } },
      }).success
    ).toBe(false);
    expect(
      consumeRoute.params.safeParse({
        query: { group: 'detection' },
        body: { executionId: 'x'.repeat(1025) },
      }).success
    ).toBe(false);
    expect(
      reserveRoute.params.safeParse({
        body: {
          executionId: 'execution',
          eventId: 'event',
          eventUuid: 'x'.repeat(1025),
        },
      }).success
    ).toBe(false);
  });
});

describe('run quota continuous KI reconciliation', () => {
  const cappedKiLimit = { enabled: true, max: 100 } as const;

  it('reconciles before enabling enforcement with a capped KI limit', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const { server } = makeServer({ repository: repository.client, canManage: true });
    const ensureCappedContinuousKiScheduled = jest.fn().mockResolvedValue(undefined);

    await enforcementRoute.handler({
      ...baseHandlerParams(server),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        globalUiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
      }),
      continuousKiOnboardingWorkflowService: { ensureCappedContinuousKiScheduled },
      params: {
        body: {
          enabled: true,
          limits: { ki_extraction: cappedKiLimit },
        },
      },
    } as never);

    expect(ensureCappedContinuousKiScheduled).toHaveBeenCalledWith({
      request: expect.anything(),
    });
    expect(await readRunQuotaSettings(repository.client)).toEqual(
      expect.objectContaining({
        enforcementEnabled: true,
        limits: expect.objectContaining({ ki_extraction: cappedKiLimit }),
      })
    );
  });

  it('reconciles before changing an enforced KI limit from unlimited to capped', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: { enabled: false, max: 0 } },
    }));
    const { server } = makeServer({ repository: repository.client, canManage: true });
    const ensureCappedContinuousKiScheduled = jest.fn().mockResolvedValue(undefined);

    await putRoute.handler({
      ...baseHandlerParams(server),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        globalUiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
      }),
      continuousKiOnboardingWorkflowService: { ensureCappedContinuousKiScheduled },
      params: {
        body: { limits: { ki_extraction: cappedKiLimit } },
      },
    } as never);

    expect(ensureCappedContinuousKiScheduled).toHaveBeenCalledTimes(1);
    expect((await readRunQuotaSettings(repository.client)).limits.ki_extraction).toEqual(
      cappedKiLimit
    );
  });

  it('does not reconcile when continuous KI is disabled', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const { server } = makeServer({ repository: repository.client, canManage: true });
    const ensureCappedContinuousKiScheduled = jest.fn();

    await enforcementRoute.handler({
      ...baseHandlerParams(server),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        globalUiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
      }),
      continuousKiOnboardingWorkflowService: { ensureCappedContinuousKiScheduled },
      params: {
        body: {
          enabled: true,
          limits: { ki_extraction: cappedKiLimit },
        },
      },
    } as never);

    expect(ensureCappedContinuousKiScheduled).not.toHaveBeenCalled();
  });

  it('does not enable enforcement when capped KI reconciliation fails', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const { server } = makeServer({ repository: repository.client, canManage: true });

    await expect(
      enforcementRoute.handler({
        ...baseHandlerParams(server),
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          globalUiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
        }),
        continuousKiOnboardingWorkflowService: {
          ensureCappedContinuousKiScheduled: jest
            .fn()
            .mockRejectedValue(new Error('reconciliation failed')),
        },
        params: {
          body: {
            enabled: true,
            limits: { ki_extraction: cappedKiLimit },
          },
        },
      } as never)
    ).rejects.toThrow('reconciliation failed');

    expect((await readRunQuotaSettings(repository.client)).enforcementEnabled).toBe(false);
  });

  it('keeps KI unlimited when capped KI reconciliation fails', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const unlimitedKiLimit = { enabled: false, max: 0 } as const;
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: unlimitedKiLimit },
    }));
    const { server } = makeServer({ repository: repository.client, canManage: true });

    await expect(
      putRoute.handler({
        ...baseHandlerParams(server),
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          globalUiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
        }),
        continuousKiOnboardingWorkflowService: {
          ensureCappedContinuousKiScheduled: jest
            .fn()
            .mockRejectedValue(new Error('reconciliation failed')),
        },
        params: {
          body: { limits: { ki_extraction: cappedKiLimit } },
        },
      } as never)
    ).rejects.toThrow('reconciliation failed');

    expect((await readRunQuotaSettings(repository.client)).limits.ki_extraction).toEqual(
      unlimitedKiLimit
    );
  });
});

describe('run quota read routes', () => {
  it('returns ledger counts with display counts kept separate', async () => {
    const repository = createInMemoryRunQuotaRepository();
    repository.seed(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId(new Date().toISOString().slice(0, 10), 'investigation'),
      {
        date: new Date().toISOString().slice(0, 10),
        group: 'investigation',
        count: 31,
        criticalOverrideCount: 1,
        allowedGrantKeys: [],
        allowedInvestigationKeys: [],
      }
    );
    const { server } = makeServer({
      repository: repository.client,
      canManage: false,
      displayCount: 37,
    });

    const response = await getRoute.handler({
      ...baseHandlerParams(server),
      params: {},
    } as never);

    expect(response.groups).toContainEqual(
      expect.objectContaining({
        group: 'investigation',
        used: 37,
        counted: 31,
        criticalOverrideCount: 1,
      })
    );
  });

  it('fails the read rather than returning incomplete display counts', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const { server } = makeServer({
      repository: repository.client,
      canManage: false,
      displayCountError: new Error('Elasticsearch unavailable'),
    });
    const warn = jest.fn();

    await expect(
      getRoute.handler({
        ...baseHandlerParams(server),
        logger: { warn },
        params: {},
      } as never)
    ).rejects.toThrow('Elasticsearch unavailable');

    expect(warn).toHaveBeenCalledWith(
      'Failed to read workflow execution counts for run quotas: Elasticsearch unavailable'
    );
  });

  it('returns ownership for an all-spaces manager', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      enabledAt: '2026-08-31T12:00:00.000Z',
      enabledBy: 'admin',
    }));
    const { server } = makeServer({ repository: repository.client, canManage: true });

    const response = await statusRoute.handler({
      ...baseHandlerParams(server),
      params: {},
    } as never);

    expect(response).toEqual(
      expect.objectContaining({
        enabledAt: '2026-08-31T12:00:00.000Z',
        enabledBy: 'admin',
        canManageLimits: true,
      })
    );
  });
});
