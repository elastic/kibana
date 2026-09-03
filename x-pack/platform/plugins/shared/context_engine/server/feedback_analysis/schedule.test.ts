/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { createFeedbackAnalysisScheduleService } from './schedule';

describe('createFeedbackAnalysisScheduleService', () => {
  let client: jest.Mocked<Pick<PluginScopedManagedWorkflowsApi, 'install' | 'uninstall'>>;
  let service: ReturnType<typeof createFeedbackAnalysisScheduleService>;

  beforeEach(() => {
    client = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
    };
    service = createFeedbackAnalysisScheduleService({
      logger: loggingSystemMock.createLogger(),
      getManagedWorkflowsClient: async () => client as unknown as PluginScopedManagedWorkflowsApi,
    });
  });

  it('installs a per-index schedule when analysis is enabled', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: '6h' } },
      spaceId: 'marketing',
    });

    expect(client.install).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'marketing',
      workflowIdSuffix: 'orders',
      values: { aiIndexId: 'orders', intervalMinutes: 360 },
    });
    expect(client.uninstall).not.toHaveBeenCalled();
  });

  it('falls back to the default interval when none is configured', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      spaceId: 'default',
    });

    expect(client.install).toHaveBeenCalledWith(
      CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
      expect.objectContaining({ values: { aiIndexId: 'orders', intervalMinutes: 1440 } })
    );
  });

  it('uninstalls when analysis is disabled', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: false, schedule: { interval: '1d' } },
      spaceId: 'default',
    });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'orders',
    });
    expect(client.install).not.toHaveBeenCalled();
  });

  it('treats a removed analysis block as disabled', async () => {
    await service.reconcile({ aiIndexId: 'orders', spaceId: 'default' });

    expect(client.uninstall).toHaveBeenCalled();
    expect(client.install).not.toHaveBeenCalled();
  });

  it('reinstalls with the new interval when the schedule changes', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: '1d' } },
      spaceId: 'default',
    });
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: '30m' } },
      spaceId: 'default',
    });

    expect(client.install).toHaveBeenLastCalledWith(
      CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
      expect.objectContaining({ values: { aiIndexId: 'orders', intervalMinutes: 30 } })
    );
  });

  it('keeps an unparsable stored interval from scheduling nothing', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: 'whenever' } },
      spaceId: 'default',
    });

    expect(client.install).toHaveBeenCalledWith(
      CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
      expect.objectContaining({ values: { aiIndexId: 'orders', intervalMinutes: 15 } })
    );
  });

  it('tears the schedule down when the AI index is deleted', async () => {
    await service.remove({ aiIndexId: 'orders', spaceId: 'marketing' });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'marketing',
      workflowIdSuffix: 'orders',
    });
  });

  it('gives each AI index its own schedule', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      spaceId: 'default',
    });
    await service.reconcile({
      aiIndexId: 'customers',
      feedbackAnalysis: { enabled: true },
      spaceId: 'default',
    });

    expect(
      client.install.mock.calls.map(
        ([, options]) => (options as { workflowIdSuffix: string }).workflowIdSuffix
      )
    ).toEqual(['orders', 'customers']);
  });
});
