/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowEnablementApi } from './schedule';
import { createFeedbackAnalysisScheduleService } from './schedule';

const WORKFLOW_DOCUMENT_ID = `${CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID}-orders`;

describe('createFeedbackAnalysisScheduleService', () => {
  let client: jest.Mocked<Pick<PluginScopedManagedWorkflowsApi, 'install' | 'uninstall'>>;
  let workflowsManagement: { updateWorkflow: jest.Mock };
  let request: KibanaRequest;
  let service: ReturnType<typeof createFeedbackAnalysisScheduleService>;

  const createService = (management: { updateWorkflow: jest.Mock } | undefined) =>
    createFeedbackAnalysisScheduleService({
      logger: loggingSystemMock.createLogger(),
      getManagedWorkflowsClient: async () => client as unknown as PluginScopedManagedWorkflowsApi,
      ...(management
        ? { workflowsManagement: management as unknown as WorkflowEnablementApi }
        : {}),
    });

  beforeEach(() => {
    client = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
    };
    workflowsManagement = { updateWorkflow: jest.fn().mockResolvedValue(undefined) };
    request = httpServerMock.createKibanaRequest();
    service = createService(workflowsManagement);
  });

  it('installs a per-index schedule when analysis is enabled', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: '6h' } },
      request,
    });

    expect(client.install).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'orders',
      values: { aiIndexId: 'orders', intervalMinutes: 360 },
    });
    expect(client.uninstall).not.toHaveBeenCalled();
  });

  it('enables the installed workflow, which is what registers its trigger', async () => {
    // Installing only writes the workflow document. Without this call nothing reaches Task
    // Manager, so the configuration reads as scheduled while no run ever happens.
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      request,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      WORKFLOW_DOCUMENT_ID,
      { enabled: true },
      'default',
      request
    );
  });

  it('enables after installing, so there is a workflow to enable', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      request,
    });

    expect(client.install.mock.invocationCallOrder[0]).toBeLessThan(
      workflowsManagement.updateWorkflow.mock.invocationCallOrder[0]
    );
  });

  it('re-enables on every write, so the schedule follows whoever saved it last', async () => {
    // Enabling mints the API key the runs execute under. Re-minting it on each write keeps the
    // schedule from expiring with the account that first turned analysis on.
    const laterRequest = httpServerMock.createKibanaRequest();

    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      request,
    });
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      request: laterRequest,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledTimes(2);
    expect(workflowsManagement.updateWorkflow).toHaveBeenLastCalledWith(
      WORKFLOW_DOCUMENT_ID,
      { enabled: true },
      'default',
      laterRequest
    );
  });

  it('refuses to install a schedule it cannot enable', async () => {
    // Installing alone would leave a workflow that looks configured and never runs, so an absent
    // management plugin has to surface rather than degrade into that.
    const withoutManagement = createService(undefined);

    await expect(
      withoutManagement.reconcile({
        aiIndexId: 'orders',
        feedbackAnalysis: { enabled: true },
        request,
      })
    ).rejects.toThrow(/workflows management plugin is not available/);
  });

  it('falls back to the default interval when none is configured', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      request,
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
      request,
    });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'orders',
    });
    expect(client.install).not.toHaveBeenCalled();
  });

  it('disables by uninstalling alone, which drops the trigger with the document', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: false },
      request,
    });

    expect(workflowsManagement.updateWorkflow).not.toHaveBeenCalled();
  });

  it('treats a removed analysis block as disabled', async () => {
    await service.reconcile({ aiIndexId: 'orders', request });

    expect(client.uninstall).toHaveBeenCalled();
    expect(client.install).not.toHaveBeenCalled();
  });

  it('reinstalls with the new interval when the schedule changes', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: '1d' } },
      request,
    });
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true, schedule: { interval: '30m' } },
      request,
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
      request,
    });

    expect(client.install).toHaveBeenCalledWith(
      CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
      expect.objectContaining({ values: { aiIndexId: 'orders', intervalMinutes: 15 } })
    );
  });

  it('tears the schedule down when the AI index is deleted', async () => {
    await service.remove({ aiIndexId: 'orders' });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'orders',
    });
  });

  it('installs and uninstalls in the same space whichever space the write came from, since an AI index is global', async () => {
    await service.reconcile({ aiIndexId: 'orders', feedbackAnalysis: { enabled: true }, request });
    await service.reconcile({ aiIndexId: 'orders', feedbackAnalysis: { enabled: false }, request });

    const [, installOptions] = client.install.mock.calls[0];
    const [, uninstallOptions] = client.uninstall.mock.calls[0];

    expect((installOptions as { spaceId: string }).spaceId).toBe('default');
    expect((uninstallOptions as { spaceId: string }).spaceId).toBe('default');
    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      WORKFLOW_DOCUMENT_ID,
      { enabled: true },
      'default',
      request
    );
  });

  it('gives each AI index its own schedule', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      feedbackAnalysis: { enabled: true },
      request,
    });
    await service.reconcile({
      aiIndexId: 'customers',
      feedbackAnalysis: { enabled: true },
      request,
    });

    expect(
      client.install.mock.calls.map(
        ([, options]) => (options as { workflowIdSuffix: string }).workflowIdSuffix
      )
    ).toEqual(['orders', 'customers']);
    expect(workflowsManagement.updateWorkflow.mock.calls.map(([workflowId]) => workflowId)).toEqual(
      [WORKFLOW_DOCUMENT_ID, `${CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID}-customers`]
    );
  });
});
