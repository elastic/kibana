/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED } from '@kbn/management-settings-ids';
import type { SignificantEventsServer } from '../../../../types';
import { createInMemoryRunQuotaRepository } from '../../../../lib/run_quotas/in_memory_repository.test_utils';
import { mutateRunQuotaSettings } from '../../../../lib/run_quotas';
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

const createHandlerParams = ({
  canManage,
  previousEnabled = false,
}: {
  canManage: boolean;
  previousEnabled?: boolean;
}) => {
  const repository = createInMemoryRunQuotaRepository();
  const setMany = jest.fn().mockResolvedValue(undefined);
  const ensureWorkflow = jest.fn().mockResolvedValue(undefined);
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
    ensureWorkflow,
    ensureCappedContinuousKiScheduled,
    globally,
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
            [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]: previousEnabled,
          }),
          setMany,
        },
      }),
      continuousKiOnboardingWorkflowService: {
        ensureWorkflow,
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

  it('uses ordinary space-scoped reconciliation while enforcement is off', async () => {
    const { params, globally, ensureWorkflow, ensureCappedContinuousKiScheduled } =
      createHandlerParams({ canManage: false });

    await expect(route.handler(params as never)).resolves.toEqual({ success: true });

    expect(globally).not.toHaveBeenCalled();
    expect(ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request: expect.anything(),
    });
    expect(ensureCappedContinuousKiScheduled).not.toHaveBeenCalled();
  });

  it('uses ordinary space-scoped reconciliation while the KI limit is unlimited', async () => {
    const { params, repository, globally, ensureWorkflow, ensureCappedContinuousKiScheduled } =
      createHandlerParams({ canManage: false });
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: { enabled: false, max: 0 } },
    }));

    await expect(route.handler(params as never)).resolves.toEqual({ success: true });

    expect(globally).not.toHaveBeenCalled();
    expect(ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request: expect.anything(),
    });
    expect(ensureCappedContinuousKiScheduled).not.toHaveBeenCalled();
  });

  it('does not reconcile an already-enabled continuous KI setting', async () => {
    const { params, repository, globally, ensureWorkflow, ensureCappedContinuousKiScheduled } =
      createHandlerParams({ canManage: false, previousEnabled: true });
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: { enabled: true, max: 100 } },
    }));

    await expect(route.handler(params as never)).resolves.toEqual({ success: true });

    expect(globally).not.toHaveBeenCalled();
    expect(ensureWorkflow).not.toHaveBeenCalled();
    expect(ensureCappedContinuousKiScheduled).not.toHaveBeenCalled();
  });

  it('rolls back the setting when capped schedule reconciliation fails', async () => {
    const { params, repository, setMany, ensureCappedContinuousKiScheduled } = createHandlerParams({
      canManage: true,
    });
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { ki_extraction: { enabled: true, max: 100 } },
    }));
    ensureCappedContinuousKiScheduled.mockRejectedValue(new Error('reconciliation failed'));

    await expect(route.handler(params as never)).rejects.toThrow('reconciliation failed');

    expect(setMany).toHaveBeenLastCalledWith({
      [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]: false,
    });
  });
});
