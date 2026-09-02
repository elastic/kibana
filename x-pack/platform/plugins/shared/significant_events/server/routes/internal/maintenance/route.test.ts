/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsServer } from '../../../types';
import { createInMemoryRunQuotaRepository } from '../../../lib/run_quotas/in_memory_repository.test_utils';
import { mutateRunQuotaSettings, readRunQuotaSettings } from '../../../lib/run_quotas';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from '../../../lib/maintenance/saved_object';
import { internalMaintenanceRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = internalMaintenanceRoutes['POST /internal/significant_events/maintenance/_resume'];
const pauseRoute =
  internalMaintenanceRoutes['POST /internal/significant_events/maintenance/_pause'];

describe('maintenance resume run quota reconciliation', () => {
  it('reconciles capped continuous KI restored by Resume before returning success', async () => {
    const repository = createInMemoryRunQuotaRepository();
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
    const globally = jest.fn().mockResolvedValue({ hasAllRequested: true });
    const server = {
      core: {
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(repository.client),
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
    } as unknown as SignificantEventsServer;
    const ensureCappedContinuousKiScheduled = jest.fn().mockResolvedValue(undefined);
    const summary = {
      state: 'enabled' as const,
      executionsCancelled: 0,
      workflowsDisabled: 0,
      rulesDisabled: 0,
      partialFailures: [],
    };

    await expect(
      route.handler({
        request: {},
        server,
        params: {},
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          globalUiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
        }),
        maintenanceService: {
          getState: jest.fn().mockResolvedValue('paused'),
          resume: jest.fn().mockResolvedValue(summary),
        },
        continuousKiOnboardingWorkflowService: {
          ensureCappedContinuousKiScheduled,
        },
      } as never)
    ).resolves.toEqual(summary);

    expect(ensureCappedContinuousKiScheduled).toHaveBeenCalledWith({
      request: expect.anything(),
    });
    expect((await readRunQuotaSettings(repository.client)).applicability?.global.generation).toBe(
      1
    );
  });

  it('advances global applicability before a maintenance pause transition', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const server = {
      core: {
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(repository.client),
        },
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ username: 'elastic' }),
          },
        },
      },
    } as unknown as SignificantEventsServer;
    const summary = {
      state: 'paused' as const,
      executionsCancelled: 0,
      workflowsDisabled: 0,
      rulesDisabled: 0,
      partialFailures: [],
    };

    await expect(
      pauseRoute.handler({
        request: {},
        server,
        params: {},
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        maintenanceService: {
          getState: jest.fn().mockResolvedValue('enabled'),
          pause: jest.fn().mockResolvedValue(summary),
        },
      } as never)
    ).resolves.toEqual(summary);

    expect((await readRunQuotaSettings(repository.client)).applicability?.global.generation).toBe(
      1
    );
  });
});
