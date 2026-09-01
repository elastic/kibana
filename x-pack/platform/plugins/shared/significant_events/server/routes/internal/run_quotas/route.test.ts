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
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  type RunQuotaLedgerAttributes,
} from '../../../lib/run_quotas/saved_objects';
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
const skippedRoute = internalRunQuotaRoutes['GET /internal/significant_events/run_quotas/_skipped'];

const makeServer = ({
  repository,
  canManage,
}: {
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>['client'];
  canManage: boolean;
}) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested: canManage });
  return {
    server: {
      core: {
        elasticsearch: {
          client: {
            asInternalUser: {
              count: jest.fn().mockResolvedValue({ count: 0 }),
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
    [getRoute, STREAMS_API_PRIVILEGES.read],
    [putRoute, STREAMS_API_PRIVILEGES.manage],
    [enforcementRoute, STREAMS_API_PRIVILEGES.manage],
    [consumeRoute, STREAMS_API_PRIVILEGES.manage],
    [reserveRoute, STREAMS_API_PRIVILEGES.manage],
    [statusRoute, STREAMS_API_PRIVILEGES.read],
    [skippedRoute, STREAMS_API_PRIVILEGES.read],
  ])('declares the required Streams privilege', (route, requiredPrivilege) => {
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
    expect(skippedRoute.params.safeParse({ query: { date: '31-08-2026' } }).success).toBe(false);
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
        withinLimitGrantCount: 30,
        criticalPastLimitGrantCount: 1,
        allowedGrantKeys: [],
        deniedGrantKeys: [],
        decisions: [],
        skipped: [],
        totalSkipped: 4,
        decisionsEvicted: false,
      }
    );
    const { server } = makeServer({ repository: repository.client, canManage: false });

    const response = await getRoute.handler({
      ...baseHandlerParams(server),
      params: {},
    } as never);

    expect(response.groups).toContainEqual(
      expect.objectContaining({
        group: 'investigation',
        used: 0,
        counted: 31,
        withinLimitGrantCount: 30,
        criticalPastLimitGrantCount: 1,
        totalSkipped: 4,
      })
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

  it('returns only the current space skipped rows, newest first, capped at 200', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const spaceRows = Array.from({ length: 201 }, (_, index) => ({
      eventUuid: `uuid-${index}`,
      eventId: `event-${index}`,
      spaceId: 'space-a',
      severity: '60-high',
      decidedAt: new Date(Date.UTC(2026, 7, 31, 0, 0, index)).toISOString(),
    }));
    const ledger: RunQuotaLedgerAttributes = {
      date: '2026-08-31',
      group: 'investigation',
      count: 0,
      withinLimitGrantCount: 0,
      criticalPastLimitGrantCount: 0,
      allowedGrantKeys: [],
      deniedGrantKeys: [],
      decisions: [],
      skipped: [
        ...spaceRows,
        {
          eventUuid: 'other-uuid',
          eventId: 'other-event',
          spaceId: 'space-b',
          severity: '60-high',
          decidedAt: '2026-08-31T23:59:59.000Z',
        },
      ],
      totalSkipped: 202,
      decisionsEvicted: true,
    };
    repository.seed(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'investigation'),
      ledger
    );
    const { server } = makeServer({ repository: repository.client, canManage: false });

    const response = await skippedRoute.handler({
      ...baseHandlerParams(server),
      params: { query: { date: '2026-08-31' } },
    } as never);

    expect(response.rows).toHaveLength(200);
    expect(response.rows[0].eventUuid).toBe('uuid-200');
    expect(response.rows).not.toContainEqual(
      expect.objectContaining({ spaceId: expect.anything() })
    );
    expect(response.totalSkipped).toBe(202);
    expect(response.truncated).toBe(true);
    expect(response.decisionsEvicted).toBe(true);
  });
});
