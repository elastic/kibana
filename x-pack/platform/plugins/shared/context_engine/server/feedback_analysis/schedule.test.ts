/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsManagementPort } from './schedule';
import {
  FeedbackAnalysisAlreadyRunningError,
  createFeedbackAnalysisScheduleService,
} from './schedule';

const DEFAULT_SPACE = 'default';

const suffixFor = (aiIndexId: string, spaceId: string) =>
  `${aiIndexId}-${createHash('sha256').update(spaceId).digest('hex').slice(0, 16)}`;

const documentIdFor = (aiIndexId: string, spaceId: string) =>
  `${CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID}-${suffixFor(aiIndexId, spaceId)}`;

const WORKFLOW_DOCUMENT_ID = documentIdFor('orders', DEFAULT_SPACE);

interface ManagementMock {
  updateWorkflow: jest.Mock;
  getWorkflowExecution: jest.Mock;
}

describe('createFeedbackAnalysisScheduleService', () => {
  let client: jest.Mocked<
    Pick<PluginScopedManagedWorkflowsApi, 'install' | 'uninstall' | 'execute'>
  >;
  let workflowsManagement: ManagementMock;
  let request: KibanaRequest;
  let service: ReturnType<typeof createFeedbackAnalysisScheduleService>;

  const createService = (management: ManagementMock | undefined) =>
    createFeedbackAnalysisScheduleService({
      logger: loggingSystemMock.createLogger(),
      getManagedWorkflowsClient: async () => client as unknown as PluginScopedManagedWorkflowsApi,
      ...(management
        ? { workflowsManagement: management as unknown as WorkflowsManagementPort }
        : {}),
    });

  beforeEach(() => {
    client = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValue('execution-1'),
    };
    workflowsManagement = {
      updateWorkflow: jest.fn().mockResolvedValue(undefined),
      // The engine only skips a run it refused, so anything else means it started.
      getWorkflowExecution: jest.fn().mockResolvedValue({ status: 'running' }),
    };
    request = httpServerMock.createKibanaRequest();
    service = createService(workflowsManagement);
  });

  it('installs a per-index schedule when analysis is enabled', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true, schedule: { interval: '6h' } },
      request,
    });

    expect(client.install).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE,
      workflowIdSuffix: suffixFor('orders', DEFAULT_SPACE),
      values: { aiIndexId: 'orders', intervalMinutes: 360 },
    });
    expect(client.uninstall).not.toHaveBeenCalled();
  });

  it('enables the installed workflow, which is what registers its trigger', async () => {
    // Installing only writes the workflow document. Without this call nothing reaches Task
    // Manager, so the configuration reads as scheduled while no run ever happens.
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true },
      request,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      WORKFLOW_DOCUMENT_ID,
      { enabled: true },
      DEFAULT_SPACE,
      request
    );
  });

  it('enables after installing, so there is a workflow to enable', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
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
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true },
      request,
    });
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true },
      request: laterRequest,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledTimes(2);
    expect(workflowsManagement.updateWorkflow).toHaveBeenLastCalledWith(
      WORKFLOW_DOCUMENT_ID,
      { enabled: true },
      DEFAULT_SPACE,
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
        spaceId: DEFAULT_SPACE,
        feedbackAnalysis: { enabled: true },
        request,
      })
    ).rejects.toThrow(/workflows management plugin is not available/);
  });

  it('falls back to the default interval when none is configured', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
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
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: false, schedule: { interval: '1d' } },
      request,
    });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE,
      workflowIdSuffix: suffixFor('orders', DEFAULT_SPACE),
    });
    expect(client.install).not.toHaveBeenCalled();
  });

  it('disables by uninstalling alone, which drops the trigger with the document', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: false },
      request,
    });

    expect(workflowsManagement.updateWorkflow).not.toHaveBeenCalled();
  });

  it('treats a removed analysis block as disabled', async () => {
    await service.reconcile({ aiIndexId: 'orders', spaceId: DEFAULT_SPACE, request });

    expect(client.uninstall).toHaveBeenCalled();
    expect(client.install).not.toHaveBeenCalled();
  });

  it('reinstalls with the new interval when the schedule changes', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true, schedule: { interval: '1d' } },
      request,
    });
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
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
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true, schedule: { interval: 'whenever' } },
      request,
    });

    expect(client.install).toHaveBeenCalledWith(
      CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
      expect.objectContaining({ values: { aiIndexId: 'orders', intervalMinutes: 15 } })
    );
  });

  it('tears the schedule down when the AI index is deleted', async () => {
    await service.remove({ aiIndexId: 'orders', spaceId: DEFAULT_SPACE });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE,
      workflowIdSuffix: suffixFor('orders', DEFAULT_SPACE),
    });
  });

  it('installs independent schedules per space for the same AI index id', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: 'default',
      feedbackAnalysis: { enabled: true },
      request,
    });
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: 'marketing',
      feedbackAnalysis: { enabled: true },
      request,
    });

    // The workflow document id is the ES `_id` and is not namespaced by space, so a suffix of
    // just the AI index id would point both spaces at one document.
    expect(client.install).toHaveBeenCalledTimes(2);
    expect(client.install.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        spaceId: 'default',
        workflowIdSuffix: suffixFor('orders', 'default'),
      })
    );
    expect(client.install.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        spaceId: 'marketing',
        workflowIdSuffix: suffixFor('orders', 'marketing'),
      })
    );
    expect(workflowsManagement.updateWorkflow.mock.calls.map(([workflowId]) => workflowId)).toEqual(
      [documentIdFor('orders', 'default'), documentIdFor('orders', 'marketing')]
    );

    await service.remove({ aiIndexId: 'orders', spaceId: 'marketing' });

    expect(client.uninstall).toHaveBeenCalledTimes(1);
    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'marketing',
      workflowIdSuffix: suffixFor('orders', 'marketing'),
    });
  });

  it('keeps hyphenated space and AI index ids from composing the same schedule', async () => {
    await service.reconcile({
      aiIndexId: 'c',
      spaceId: 'a-b',
      feedbackAnalysis: { enabled: true },
      request,
    });
    await service.reconcile({
      aiIndexId: 'b-c',
      spaceId: 'a',
      feedbackAnalysis: { enabled: true },
      request,
    });

    const [first, second] = client.install.mock.calls.map(
      ([, options]) => (options as { workflowIdSuffix: string }).workflowIdSuffix
    );
    expect(first).not.toEqual(second);
  });

  it('gives each AI index its own schedule', async () => {
    await service.reconcile({
      aiIndexId: 'orders',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true },
      request,
    });
    await service.reconcile({
      aiIndexId: 'customers',
      spaceId: DEFAULT_SPACE,
      feedbackAnalysis: { enabled: true },
      request,
    });

    expect(
      client.install.mock.calls.map(
        ([, options]) => (options as { workflowIdSuffix: string }).workflowIdSuffix
      )
    ).toEqual([suffixFor('orders', DEFAULT_SPACE), suffixFor('customers', DEFAULT_SPACE)]);
    expect(workflowsManagement.updateWorkflow.mock.calls.map(([workflowId]) => workflowId)).toEqual(
      [WORKFLOW_DOCUMENT_ID, documentIdFor('customers', DEFAULT_SPACE)]
    );
  });

  describe('running one now', () => {
    it('returns the execution it started', async () => {
      await expect(service.run({ aiIndexId: 'orders', request })).resolves.toBe('execution-1');

      expect(client.execute).toHaveBeenCalledWith(
        request,
        CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
        expect.objectContaining({ workflowIdSuffix: 'orders', triggeredBy: 'manual' })
      );
    });

    it('reports a run that collided with one already in flight', async () => {
      // The workflow caps itself at one run per index and drops the rest. A dropped run is still
      // given an execution id, so only its status says it never started.
      workflowsManagement.getWorkflowExecution.mockResolvedValue({ status: 'skipped' });

      await expect(service.run({ aiIndexId: 'orders', request })).rejects.toBeInstanceOf(
        FeedbackAnalysisAlreadyRunningError
      );

      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledWith(
        'execution-1',
        'default'
      );
    });

    it('reads the execution back from the space the schedule lives in', async () => {
      await service.run({ aiIndexId: 'orders', request });

      // Not the caller's space: the instance is pinned where it was installed, so looking anywhere
      // else would find nothing and report every run as started.
      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledWith(
        'execution-1',
        'default'
      );
    });

    it('treats a run it cannot check as started', async () => {
      // Saying "already running" on a failed read would tell the user not to retry the one thing
      // that would fix it.
      workflowsManagement.getWorkflowExecution.mockRejectedValue(
        new Error('executions unreadable')
      );

      await expect(service.run({ aiIndexId: 'orders', request })).resolves.toBe('execution-1');
    });

    it('starts a run without workflows management, since there is nothing to ask', async () => {
      const withoutManagement = createService(undefined);

      await expect(withoutManagement.run({ aiIndexId: 'orders', request })).resolves.toBe(
        'execution-1'
      );
    });
  });
});
