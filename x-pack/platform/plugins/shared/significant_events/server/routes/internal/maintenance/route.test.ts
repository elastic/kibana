/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsServer } from '../../../types';
import { createInMemoryRunQuotaRepository } from '../../../lib/run_quotas/in_memory_repository.test_utils';
import { mutateRunQuotaSettings } from '../../../lib/run_quotas';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from '../../../lib/maintenance/saved_object';
import { internalMaintenanceRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = internalMaintenanceRoutes['POST /internal/significant_events/maintenance/_resume'];

const summary = {
  state: 'enabled' as const,
  executionsCancelled: 0,
  workflowsDisabled: 0,
  rulesDisabled: 0,
  partialFailures: [],
};

const createServer = (
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>['client'],
  canManage: boolean
) =>
  ({
    core: {
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
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({
          globally: jest.fn().mockResolvedValue({ hasAllRequested: canManage }),
        }),
      },
    },
  } as unknown as SignificantEventsServer);

const prepareCappedContinuousKiResume = async (
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>
) => {
  await mutateRunQuotaSettings(repository.client, () => ({
    enforcementEnabled: true,
    limits: { ki_extraction: { enabled: true, max: 100 } },
  }));
  repository.seed(
    SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
    SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
    {
      state: 'paused',
      disabledWorkflows: [],
      disabledRuleIds: [],
      pausedSettings: {
        continuousOnboardingWasEnabled: true,
        scheduledDiscoveryEnabledSpaceIds: [],
      },
    }
  );
};

const createHandlerParams = ({
  server,
  ensureCappedContinuousKiScheduled,
  resume,
}: {
  server: SignificantEventsServer;
  ensureCappedContinuousKiScheduled: jest.Mock;
  resume: jest.Mock;
}) => ({
  request: {},
  server,
  params: {},
  getScopedClients: jest.fn().mockResolvedValue({
    licensing: {},
    globalUiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
  }),
  maintenanceService: {
    getState: jest.fn().mockResolvedValue('paused'),
    resume,
  },
  continuousKiOnboardingWorkflowService: {
    ensureCappedContinuousKiScheduled,
  },
});

describe('maintenance resume run quota reconciliation', () => {
  it('reconciles capped continuous KI restored by Resume before returning success', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await prepareCappedContinuousKiResume(repository);
    const ensureCappedContinuousKiScheduled = jest.fn().mockResolvedValue(undefined);
    const resume = jest.fn().mockResolvedValue(summary);

    await expect(
      route.handler(
        createHandlerParams({
          server: createServer(repository.client, true),
          ensureCappedContinuousKiScheduled,
          resume,
        }) as never
      )
    ).resolves.toEqual(summary);

    expect(ensureCappedContinuousKiScheduled).toHaveBeenCalledWith({
      request: expect.anything(),
    });
    expect(resume).toHaveBeenCalledTimes(1);
    expect(ensureCappedContinuousKiScheduled.mock.invocationCallOrder[0]).toBeLessThan(
      resume.mock.invocationCallOrder[0]
    );
  });

  it('does not reconcile or resume without deployment-wide Streams manage', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await prepareCappedContinuousKiResume(repository);
    const ensureCappedContinuousKiScheduled = jest.fn();
    const resume = jest.fn();

    await expect(
      route.handler(
        createHandlerParams({
          server: createServer(repository.client, false),
          ensureCappedContinuousKiScheduled,
          resume,
        }) as never
      )
    ).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(ensureCappedContinuousKiScheduled).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('does not resume when capped schedule reconciliation fails', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await prepareCappedContinuousKiResume(repository);
    const ensureCappedContinuousKiScheduled = jest
      .fn()
      .mockRejectedValue(new Error('reconciliation failed'));
    const resume = jest.fn();

    await expect(
      route.handler(
        createHandlerParams({
          server: createServer(repository.client, true),
          ensureCappedContinuousKiScheduled,
          resume,
        }) as never
      )
    ).rejects.toThrow('reconciliation failed');

    expect(resume).not.toHaveBeenCalled();
  });
});
