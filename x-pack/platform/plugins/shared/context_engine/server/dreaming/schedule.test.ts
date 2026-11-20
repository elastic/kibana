/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { ExecutionStatus } from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import type { AiIndexService } from '../ai_indices/service';
import type { DreamingWorkflowsApi } from './schedule';
import { DreamingNotSetUpError } from './dreaming_not_set_up_error';
import { DreamingRunNothingStartedError } from './dreaming_run_nothing_started_error';
import {
  createDreamingScheduleService,
  dreamingWorkflowIdFor,
  relationshipsWorkflowIdFor,
  shouldDream,
  traceDreamingBatchWorkflowIdFor,
  traceDreamingWorkflowIdFor,
} from './schedule';

const SPACE = 'marketing';
const suffix = `support-${createHash('sha256').update(SPACE).digest('hex').slice(0, 16)}`;
const WORKFLOW_ID = `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-${suffix}`;

const dreaming = {
  enabled: true,
  schedule: { interval: '6h' },
  instructions: 'Remember what customers prefer.',
  facts: [{ type: 'preference', description: 'Something a customer wants.' }],
  entities: { nodes: [{ type: 'customer', attributes: ['tier'] }, { type: 'city' }] },
  relationships: [{ type: 'lives_in', description: 'A customer lives in a city.' }],
};

const aiIndex = (overrides: Partial<AiIndexItem> = {}): AiIndexItem => ({
  id: 'support',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-support' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
  dreaming,
  ...overrides,
});

describe('shouldDream', () => {
  it('dreams only with dreaming on and a type to build', () => {
    expect(shouldDream(aiIndex())).toBe(true);
    expect(shouldDream(aiIndex({ dreaming: { ...dreaming, enabled: false } }))).toBe(false);
    expect(shouldDream(aiIndex({ dreaming: { enabled: true } }))).toBe(false);
    expect(shouldDream(aiIndex({ dreaming: undefined }))).toBe(false);
  });
});

describe('createDreamingScheduleService', () => {
  let client: jest.Mocked<
    Pick<PluginScopedManagedWorkflowsApi, 'install' | 'uninstall' | 'execute'>
  >;
  let workflowsManagement: {
    updateWorkflow: jest.Mock;
    cancelAllActiveWorkflowExecutions: jest.Mock;
    getWorkflowExecution: jest.Mock;
  };
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'addAutomation' | 'removeAutomation'>>;
  let request: KibanaRequest;

  const createService = (management: typeof workflowsManagement | undefined) =>
    createDreamingScheduleService({
      logger: loggingSystemMock.createLogger(),
      getManagedWorkflowsClient: async () => client as unknown as PluginScopedManagedWorkflowsApi,
      getWorkflowsManagement: async () => management as unknown as DreamingWorkflowsApi | undefined,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
    });

  beforeEach(() => {
    client = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
    };
    workflowsManagement = {
      updateWorkflow: jest.fn().mockResolvedValue(undefined),
      cancelAllActiveWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
      getWorkflowExecution: jest.fn().mockResolvedValue({ status: ExecutionStatus.RUNNING }),
    };
    aiIndexService = {
      addAutomation: jest.fn().mockResolvedValue('attached'),
      removeAutomation: jest.fn().mockResolvedValue('removed'),
    };
    request = httpServerMock.createKibanaRequest();
  });

  it('names the workflow per AI index and space', () => {
    expect(dreamingWorkflowIdFor('support', SPACE)).toBe(WORKFLOW_ID);
    expect(dreamingWorkflowIdFor('support', 'default')).not.toBe(WORKFLOW_ID);
  });

  it('installs the workflow with the saved config as its values', async () => {
    await createService(workflowsManagement).reconcile({
      aiIndex: aiIndex(),
      spaceId: SPACE,
      request,
    });

    expect(client.install).toHaveBeenCalledWith(CONTEXT_ENGINE_DREAMING_WORKFLOW_ID, {
      spaceId: SPACE,
      workflowIdSuffix: suffix,
      values: {
        aiIndexId: 'support',
        instanceKey: suffix,
        memoriesIndex: 'ai-index-idx-support',
        intervalMinutes: 360,
        connectorId: '',
        instructions: 'Remember what customers prefer.',
        factTypes: dreaming.facts,
        entityTypes: dreaming.entities.nodes,
        relationshipTypes: dreaming.relationships,
      },
    });
  });

  it('defaults the schedule and passes the configured model', async () => {
    await createService(workflowsManagement).reconcile({
      aiIndex: aiIndex({
        dreaming: { enabled: true, connector_id: 'my-connector', facts: [{ type: 'note' }] },
      }),
      spaceId: SPACE,
      request,
    });

    expect(client.install.mock.calls[0][1].values).toEqual(
      expect.objectContaining({
        intervalMinutes: 1440,
        connectorId: 'my-connector',
        instructions: '',
        entityTypes: [],
        relationshipTypes: [],
      })
    );
  });

  it('enables the workflow as the caller, and attaches it to the AI index', async () => {
    await createService(workflowsManagement).reconcile({
      aiIndex: aiIndex(),
      spaceId: SPACE,
      request,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      WORKFLOW_ID,
      { enabled: true },
      SPACE,
      request
    );
    expect(aiIndexService.addAutomation).toHaveBeenCalledWith('support', SPACE, {
      type: 'workflow',
      value: WORKFLOW_ID,
    });
  });

  it('does not attach the workflow to a managed AI index, which takes no automations', async () => {
    await createService(workflowsManagement).reconcile({
      aiIndex: aiIndex({ managed: true }),
      spaceId: SPACE,
      request,
    });

    expect(client.install).toHaveBeenCalled();
    expect(aiIndexService.addAutomation).not.toHaveBeenCalled();
  });

  it.each([
    ['dreaming is off', { dreaming: { ...dreaming, enabled: false } }],
    ['dreaming was never configured', { dreaming: undefined }],
  ])('removes the workflow and detaches it when %s', async (_, overrides) => {
    await createService(workflowsManagement).reconcile({
      aiIndex: aiIndex(overrides),
      spaceId: SPACE,
      request,
    });

    expect(client.install).not.toHaveBeenCalled();
    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_DREAMING_WORKFLOW_ID, {
      spaceId: SPACE,
      workflowIdSuffix: suffix,
    });
    expect(aiIndexService.removeAutomation).toHaveBeenCalledWith('support', SPACE, {
      type: 'workflow',
      value: WORKFLOW_ID,
    });
  });

  describe('trace dreaming', () => {
    const traceWorkflowId = `${CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID}-${suffix}`;

    it('installs, enables and attaches its workflow with dreaming, on the same config', async () => {
      await createService(workflowsManagement).reconcile({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      expect(traceDreamingWorkflowIdFor('support', SPACE)).toBe(traceWorkflowId);
      const [[dreamingId, dreamingInstall], [batchId, batchInstall], [traceId, traceInstall]] =
        client.install.mock.calls;
      expect([dreamingId, batchId, traceId]).toEqual([
        CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
        CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
        CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
      ]);
      expect(batchInstall).toEqual(dreamingInstall);
      expect(traceInstall).toEqual(dreamingInstall);
      expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
        traceWorkflowId,
        { enabled: true },
        SPACE,
        request
      );
      expect(aiIndexService.addAutomation).toHaveBeenCalledWith('support', SPACE, {
        type: 'workflow',
        value: traceWorkflowId,
      });
    });

    it('enables the batch workflow it runs each batch with, without making it an automation', async () => {
      await createService(workflowsManagement).reconcile({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      const batchWorkflowId = traceDreamingBatchWorkflowIdFor('support', SPACE);
      expect(batchWorkflowId).toBe(`${CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID}-${suffix}`);
      expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
        batchWorkflowId,
        { enabled: true },
        SPACE,
        request
      );
      expect(aiIndexService.addAutomation).not.toHaveBeenCalledWith('support', SPACE, {
        type: 'workflow',
        value: batchWorkflowId,
      });
    });

    it('installs and attaches the relationships workflow last, to link what dreaming wrote', async () => {
      await createService(workflowsManagement).reconcile({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      const relationshipsWorkflowId = relationshipsWorkflowIdFor('support', SPACE);
      expect(relationshipsWorkflowId).toBe(`${CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID}-${suffix}`);
      expect(client.install.mock.calls.map(([definitionId]) => definitionId)).toEqual([
        CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
        CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
        CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
        CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
      ]);
      expect(aiIndexService.addAutomation.mock.calls.map(([, , { value }]) => value)).toEqual([
        `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-${suffix}`,
        traceWorkflowId,
        relationshipsWorkflowId,
      ]);
    });

    it('is installed whether or not the AI index has trace sources yet', async () => {
      await createService(workflowsManagement).reconcile({
        aiIndex: aiIndex({ traces: [] }),
        spaceId: SPACE,
        request,
      });

      expect(client.install).toHaveBeenCalledWith(
        CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
        expect.anything()
      );
    });

    it('is removed and detached with dreaming, and with the AI index', async () => {
      const service = createService(workflowsManagement);
      await service.reconcile({
        aiIndex: aiIndex({ dreaming: { ...dreaming, enabled: false } }),
        spaceId: SPACE,
        request,
      });
      expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID, {
        spaceId: SPACE,
        workflowIdSuffix: suffix,
      });
      expect(aiIndexService.removeAutomation).toHaveBeenCalledWith('support', SPACE, {
        type: 'workflow',
        value: traceWorkflowId,
      });

      client.uninstall.mockClear();
      await service.remove({ aiIndexId: 'support', spaceId: SPACE, request });
      expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID, {
        spaceId: SPACE,
        workflowIdSuffix: suffix,
      });
    });
  });

  it('refuses to install a workflow it could not enable', async () => {
    await expect(
      createService(undefined).reconcile({ aiIndex: aiIndex(), spaceId: SPACE, request })
    ).rejects.toThrow('the workflows management plugin is not available');
    expect(client.install).not.toHaveBeenCalled();
  });

  it('removes the workflow of a deleted AI index', async () => {
    await createService(workflowsManagement).remove({
      aiIndexId: 'support',
      spaceId: SPACE,
      request,
    });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_DREAMING_WORKFLOW_ID, {
      spaceId: SPACE,
      workflowIdSuffix: suffix,
    });
    expect(aiIndexService.removeAutomation).not.toHaveBeenCalled();
  });

  it('cancels a run in progress, which blocks the uninstall, then uninstalls', async () => {
    client.uninstall
      .mockRejectedValueOnce(
        new Error(`Cannot force-delete workflow with running executions: ${WORKFLOW_ID}`)
      )
      .mockRejectedValueOnce(
        new Error(`Cannot force-delete workflow with running executions: ${WORKFLOW_ID}`)
      )
      .mockResolvedValue(undefined);

    await createService(workflowsManagement).remove({
      aiIndexId: 'support',
      spaceId: SPACE,
      request,
    });

    expect(workflowsManagement.cancelAllActiveWorkflowExecutions).toHaveBeenCalledWith(
      WORKFLOW_ID,
      SPACE,
      request
    );
    expect(client.uninstall).toHaveBeenCalledTimes(6);
  });

  it('does not cancel runs when the uninstall fails for another reason', async () => {
    client.uninstall.mockRejectedValue(new Error('cluster unavailable'));

    await expect(
      createService(workflowsManagement).remove({ aiIndexId: 'support', spaceId: SPACE, request })
    ).rejects.toThrow('cluster unavailable');
    expect(workflowsManagement.cancelAllActiveWorkflowExecutions).not.toHaveBeenCalled();
  });

  describe('getWorkflowIds', () => {
    it('returns no ids when dreaming is off or not set up', () => {
      const service = createService(workflowsManagement);
      expect(
        service.getWorkflowIds({
          aiIndex: aiIndex({ dreaming: { enabled: false } }),
          spaceId: SPACE,
        })
      ).toEqual([]);
      expect(
        service.getWorkflowIds({
          aiIndex: aiIndex({ dreaming: { enabled: true } }),
          spaceId: SPACE,
        })
      ).toEqual([]);
    });

    it('returns attached workflow ids in display order', () => {
      const ids = createService(workflowsManagement).getWorkflowIds({
        aiIndex: aiIndex(),
        spaceId: SPACE,
      });

      expect(ids).toEqual([
        dreamingWorkflowIdFor('support', SPACE),
        traceDreamingWorkflowIdFor('support', SPACE),
        relationshipsWorkflowIdFor('support', SPACE),
      ]);
    });
  });

  describe('run', () => {
    it('rejects when dreaming is not set up', async () => {
      await expect(
        createService(workflowsManagement).run({
          aiIndex: aiIndex({ dreaming: { enabled: true } }),
          spaceId: SPACE,
          request,
        })
      ).rejects.toBeInstanceOf(DreamingNotSetUpError);
    });

    it('rejects when dreaming is disabled', async () => {
      await expect(
        createService(workflowsManagement).run({
          aiIndex: aiIndex({ dreaming: { ...dreaming, enabled: false } }),
          spaceId: SPACE,
          request,
        })
      ).rejects.toBeInstanceOf(DreamingNotSetUpError);
    });

    it('starts all three workflows and returns partial failures', async () => {
      const dreamingId = dreamingWorkflowIdFor('support', SPACE);
      const traceId = traceDreamingWorkflowIdFor('support', SPACE);
      const relationshipsId = relationshipsWorkflowIdFor('support', SPACE);
      client.execute
        .mockResolvedValueOnce('exec-dreaming')
        .mockRejectedValueOnce(new Error('Cannot start: running executions'))
        .mockResolvedValueOnce('exec-relationships');

      const result = await createService(workflowsManagement).run({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      expect(client.execute).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        executions: [
          { workflow_id: dreamingId, execution_id: 'exec-dreaming' },
          { workflow_id: relationshipsId, execution_id: 'exec-relationships' },
        ],
        failed: [traceId],
        skipped: [],
      });
    });

    it('puts concurrency-skipped runs in skipped instead of executions', async () => {
      const dreamingId = dreamingWorkflowIdFor('support', SPACE);
      const traceId = traceDreamingWorkflowIdFor('support', SPACE);
      const relationshipsId = relationshipsWorkflowIdFor('support', SPACE);
      client.execute
        .mockResolvedValueOnce('exec-dreaming')
        .mockResolvedValueOnce('exec-trace-skipped')
        .mockResolvedValueOnce('exec-relationships');
      workflowsManagement.getWorkflowExecution.mockImplementation(async (executionId: string) =>
        executionId === 'exec-trace-skipped'
          ? { status: ExecutionStatus.SKIPPED }
          : { status: ExecutionStatus.RUNNING }
      );

      const result = await createService(workflowsManagement).run({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledWith(
        'exec-trace-skipped',
        SPACE,
        { request }
      );
      expect(result).toEqual({
        executions: [
          { workflow_id: dreamingId, execution_id: 'exec-dreaming' },
          { workflow_id: relationshipsId, execution_id: 'exec-relationships' },
        ],
        failed: [],
        skipped: [traceId],
      });
    });

    it('returns only skipped workflows when every run is skipped', async () => {
      const dreamingId = dreamingWorkflowIdFor('support', SPACE);
      const traceId = traceDreamingWorkflowIdFor('support', SPACE);
      const relationshipsId = relationshipsWorkflowIdFor('support', SPACE);
      client.execute
        .mockResolvedValueOnce('exec-dreaming-skipped')
        .mockResolvedValueOnce('exec-trace-skipped')
        .mockResolvedValueOnce('exec-relationships-skipped');
      workflowsManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.SKIPPED,
      });

      const result = await createService(workflowsManagement).run({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      expect(result).toEqual({
        executions: [],
        failed: [],
        skipped: [dreamingId, traceId, relationshipsId],
      });
    });

    it('throws when no workflow could be started', async () => {
      client.execute.mockRejectedValue(new Error('running executions'));

      await expect(
        createService(workflowsManagement).run({
          aiIndex: aiIndex(),
          spaceId: SPACE,
          request,
        })
      ).rejects.toBeInstanceOf(DreamingRunNothingStartedError);
    });

    it('treats an execution as started when its status cannot be read yet', async () => {
      const dreamingId = dreamingWorkflowIdFor('support', SPACE);
      client.execute
        .mockResolvedValueOnce('exec-dreaming')
        .mockResolvedValueOnce('exec-trace')
        .mockResolvedValueOnce('exec-relationships');
      workflowsManagement.getWorkflowExecution.mockResolvedValue(null);

      const result = await createService(workflowsManagement).run({
        aiIndex: aiIndex(),
        spaceId: SPACE,
        request,
      });

      expect(result.executions).toHaveLength(3);
      expect(result.executions[0]).toEqual({
        workflow_id: dreamingId,
        execution_id: 'exec-dreaming',
      });
      expect(result.skipped).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  });
});
