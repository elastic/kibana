/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED } from '@kbn/management-settings-ids';
import type { SignificantEventsServer } from '../../../../types';
import { createInMemoryRunQuotaRepository } from '../../../../lib/run_quotas/in_memory_repository.test_utils';
import { getRunQuotaHeartbeatId, mutateRunQuotaSettings } from '../../../../lib/run_quotas';
import { RUN_QUOTA_HEARTBEAT_SO_TYPE } from '../../../../lib/run_quotas/saved_objects';
import { internalKIContinuousKIExtractionRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../utils/assert_not_paused', () => ({
  assertNotPaused: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalKIContinuousKIExtractionRoutes[
    'PUT /internal/streams/_knowledge_indicators/continuous_ki_extraction/settings'
  ];

const createHandlerParams = ({ canManage }: { canManage: boolean }) => {
  const repository = createInMemoryRunQuotaRepository();
  const setMany = jest.fn().mockResolvedValue(undefined);
  const ensureCappedContinuousKiScheduled = jest.fn().mockResolvedValue(undefined);
  const globally = jest.fn().mockResolvedValue({ hasAllRequested: canManage });
  const server = {
    core: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue(repository.client),
      },
    },
    security: {
      authz: {
        actions: { api: { get: jest.fn((privilege) => `api:${privilege}`) } },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
      },
    },
  } as unknown as SignificantEventsServer;

  return {
    ensureCappedContinuousKiScheduled,
    repository,
    setMany,
    params: {
      request: {},
      server,
      params: {
        body: {
          continuousKiExtraction: { enabled: true },
        },
      },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        globalUiSettingsClient: {
          getAll: jest.fn().mockResolvedValue({
            [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]: false,
          }),
          setMany,
        },
      }),
      continuousKiOnboardingWorkflowService: {
        ensureCappedContinuousKiScheduled,
      },
      maintenanceService: {},
      logger: { warn: jest.fn() },
    },
  };
};

describe('continuous KI settings run quota reconciliation', () => {
  it('reconciles before reporting a capped continuous KI enablement as successful', async () => {
    const { params, repository, ensureCappedContinuousKiScheduled } = createHandlerParams({
      canManage: true,
    });
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: { enabled: true, max: 100 } },
    }));

    await expect(route.handler(params as never)).resolves.toEqual({ success: true });
    expect(ensureCappedContinuousKiScheduled).toHaveBeenCalledWith({
      request: expect.anything(),
    });
    expect(
      repository.getAttributes(
        RUN_QUOTA_HEARTBEAT_SO_TYPE,
        getRunQuotaHeartbeatId('ki_extraction', 'default')
      )
    ).toEqual(expect.objectContaining({ scheduleGeneration: 1 }));
  });

  it('requires deployment-wide Streams manage before triggering reconciliation', async () => {
    const { params, repository, setMany, ensureCappedContinuousKiScheduled } = createHandlerParams({
      canManage: false,
    });
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: { enabled: true, max: 100 } },
    }));

    await expect(route.handler(params as never)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(setMany).not.toHaveBeenCalled();
    expect(ensureCappedContinuousKiScheduled).not.toHaveBeenCalled();
  });
});
