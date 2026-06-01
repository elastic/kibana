/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { FormPromptResponse } from '@kbn/agent-builder-common/agents/prompts';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import {
  createConversationClientMock,
  createConversationServiceMock,
} from '../../../../../test_utils/conversations';
import { resumeFormPrompts } from '.';

jest.mock('../handle_form_prompt', () => ({
  handleFormPromptResponse: jest
    .fn()
    .mockResolvedValue({ kind: 'resumed', observedExecution: null, observedStatus: 'unknown' }),
}));

import { handleFormPromptResponse } from '../handle_form_prompt';

const mockHandleFormPromptResponse = handleFormPromptResponse as jest.MockedFunction<
  typeof handleFormPromptResponse
>;

type WorkflowApi = WorkflowsServerPluginSetup['management'];

const makeWorkflowApi = (): WorkflowApi =>
  ({
    resumeWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  } as unknown as WorkflowApi);

const makePluginsSetup = (workflowApi?: WorkflowApi) =>
  ({
    workflowsManagement: workflowApi ? { management: workflowApi } : undefined,
  } as any);

const makeFormPrompt = (overrides: Partial<FormPromptResponse> = {}): FormPromptResponse => ({
  execution_id: 'exec-1',
  id: 'prompt-1',
  values: { approved: true },
  ...overrides,
});

const makeParams = (overrides: Record<string, unknown> = {}) => {
  const conversationService = createConversationServiceMock();
  const getInternalServices = jest.fn().mockReturnValue({ conversations: conversationService });
  const coreSetup = { analytics: { optIn: jest.fn() } } as any;
  const request = {} as KibanaRequest;
  const workflowApi = makeWorkflowApi();
  const pluginsSetup = makePluginsSetup(workflowApi);

  return {
    coreSetup,
    conversationService,
    getInternalServices,
    payload: {
      form_prompts: [makeFormPrompt()],
      conversation_id: 'conv-1',
    } as any,
    pluginsSetup,
    request,
    spaceId: 'default',
    workflowApi,
    ...overrides,
  };
};

const makeObservedExecution = (
  overrides: Partial<WorkflowExecutionState> = {}
): WorkflowExecutionState => ({
  execution_id: 'exec-1',
  finished_at: '2024-01-01T00:01:00Z',
  started_at: '2024-01-01T00:00:00Z',
  status: 'completed' as any,
  workflow_id: 'wf-1',
  ...overrides,
});

describe('resumeFormPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleFormPromptResponse.mockResolvedValue({
      kind: 'resumed',
      observedExecution: null,
      observedStatus: 'unknown',
    });
  });

  it('returns empty array when form_prompts is undefined', async () => {
    const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

    const result = await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: undefined } as any,
      pluginsSetup,
      request,
      spaceId,
    });

    expect(result).toEqual([]);
    expect(mockHandleFormPromptResponse).not.toHaveBeenCalled();
  });

  it('returns empty array when form_prompts is empty', async () => {
    const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

    const result = await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: [] } as any,
      pluginsSetup,
      request,
      spaceId,
    });

    expect(result).toEqual([]);
    expect(mockHandleFormPromptResponse).not.toHaveBeenCalled();
  });

  it('returns empty array when workflowsManagement plugin is absent', async () => {
    const { coreSetup, getInternalServices, request, spaceId } = makeParams();

    const result = await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: [makeFormPrompt()] } as any,
      pluginsSetup: makePluginsSetup(undefined),
      request,
      spaceId,
    });

    expect(result).toEqual([]);
    expect(mockHandleFormPromptResponse).not.toHaveBeenCalled();
  });

  it('resolves a scoped ConversationClient only when conversationId is present', async () => {
    const { coreSetup, conversationService, getInternalServices, pluginsSetup, request, spaceId } =
      makeParams();

    await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: [makeFormPrompt()], conversation_id: 'conv-123' } as any,
      pluginsSetup,
      request,
      spaceId,
    });

    expect(conversationService.getScopedClient).toHaveBeenCalledWith({ request });
  });

  it('does not resolve a ConversationClient when conversationId is absent', async () => {
    const { coreSetup, conversationService, getInternalServices, pluginsSetup, request, spaceId } =
      makeParams();

    await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: [makeFormPrompt()] } as any,
      pluginsSetup,
      request,
      spaceId,
    });

    expect(conversationService.getScopedClient).not.toHaveBeenCalled();
  });

  it('calls handleFormPromptResponse once per prompt in parallel', async () => {
    const prompts = [makeFormPrompt({ id: 'p1' }), makeFormPrompt({ id: 'p2' })];
    const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

    await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: prompts } as any,
      pluginsSetup,
      request,
      spaceId,
    });

    expect(mockHandleFormPromptResponse).toHaveBeenCalledTimes(2);
  });

  it('forwards an error thrown by handleFormPromptResponse', async () => {
    const error = new Error('handle failed');
    mockHandleFormPromptResponse.mockRejectedValueOnce(error);

    const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

    await expect(
      resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt()] } as any,
        pluginsSetup,
        request,
        spaceId,
      })
    ).rejects.toThrow('handle failed');
  });

  it('passes analytics, spaceId, workflowApi, conversationClient, and conversationId to handleFormPromptResponse', async () => {
    const {
      coreSetup,
      conversationService,
      getInternalServices,
      pluginsSetup,
      request,
      spaceId,
      workflowApi,
    } = makeParams();

    const mockConversationClient = createConversationClientMock();
    conversationService.getScopedClient.mockResolvedValue(mockConversationClient);

    const formPrompt = makeFormPrompt({ execution_id: 'exec-42', id: 'p-42' });

    await resumeFormPrompts({
      coreSetup,
      getInternalServices,
      payload: { form_prompts: [formPrompt], conversation_id: 'conv-999' } as any,
      pluginsSetup,
      request,
      spaceId,
    });

    expect(mockHandleFormPromptResponse).toHaveBeenCalledWith({
      analytics: coreSetup.analytics,
      conversationClient: mockConversationClient,
      conversationId: 'conv-999',
      formPromptResponse: formPrompt,
      request,
      spaceId,
      workflowApi,
    });
  });

  describe('resumed outcome', () => {
    it('uses observedExecution and observedStatus from handler outcome', async () => {
      const observedExecution = makeObservedExecution({
        execution_id: 'exec-fresh',
        status: 'completed' as any,
      });
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution,
        observedStatus: 'completed',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-fresh' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toEqual([
        {
          execution_id: 'exec-fresh',
          observedExecution,
          observedStatus: 'completed',
        },
      ]);
    });

    it('uses "unknown" as observedStatus when handler returns null observedExecution', async () => {
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution: null,
        observedStatus: 'unknown',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-null' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toEqual([
        {
          execution_id: 'exec-null',
          observedExecution: null,
          observedStatus: 'unknown',
        },
      ]);
    });

    it('returns handler-provided observedStatus without a second poll', async () => {
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution: null,
        observedStatus: 'WAITING_FOR_INPUT',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-wi' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toEqual([
        {
          execution_id: 'exec-wi',
          observedExecution: null,
          observedStatus: 'WAITING_FOR_INPUT',
        },
      ]);
    });
  });

  describe('stale outcome — workflow_already_resolved', () => {
    it('returns ResumedFormPromptState with null observedExecution and observedStatus from outcome', async () => {
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'stale',
        observedExecution: null,
        reason: 'workflow_already_resolved',
        observedStatus: 'completed',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-resolved' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toEqual([
        {
          execution_id: 'exec-resolved',
          observedExecution: null,
          observedStatus: 'completed',
        },
      ]);
    });
  });

  describe('stale outcome — concurrent_resume', () => {
    it('returns ResumedFormPromptState with null observedExecution and observedStatus from outcome', async () => {
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'stale',
        observedExecution: null,
        reason: 'concurrent_resume',
        observedStatus: 'running',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-concurrent' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toEqual([
        {
          execution_id: 'exec-concurrent',
          observedExecution: null,
          observedStatus: 'running',
        },
      ]);
    });
  });

  describe('stale outcome — workflow_advanced', () => {
    it('passes observedExecution from outcome so refreshStaleWorkflowExecution receives correct step context', async () => {
      // When workflow_advanced is the reason, the observed execution has the new step's
      // step_execution_id. Passing null (old behaviour) causes refreshStaleWorkflowExecution
      // to fall back to buildFreshExecution (no step_execution_id), so the LLM regenerates
      // the initial "workflow started" narrative instead of acknowledging the advance.
      const step2Execution = makeObservedExecution({
        execution_id: 'exec-advanced',
        status: 'waiting_for_input' as any,
      });
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'stale',
        observedExecution: step2Execution,
        reason: 'workflow_advanced',
        observedStatus: 'waiting_for_input',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-advanced' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toEqual([
        {
          execution_id: 'exec-advanced',
          observedExecution: step2Execution,
          observedStatus: 'waiting_for_input',
        },
      ]);
    });
  });

  describe('mixed batch', () => {
    it('returns ResumedFormPromptState for each prompt regardless of outcome', async () => {
      const observedExecution = makeObservedExecution({
        execution_id: 'exec-a',
        status: 'completed' as any,
      });
      mockHandleFormPromptResponse
        .mockResolvedValueOnce({
          kind: 'resumed',
          observedExecution,
          observedStatus: 'completed',
        })
        .mockResolvedValueOnce({
          kind: 'stale',
          observedExecution: null,
          reason: 'workflow_already_resolved',
          observedStatus: 'failed',
        });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: {
          form_prompts: [
            makeFormPrompt({ execution_id: 'exec-a', id: 'p-a' }),
            makeFormPrompt({ execution_id: 'exec-b', id: 'p-b' }),
          ],
        } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        execution_id: 'exec-a',
        observedExecution,
        observedStatus: 'completed',
      });
      expect(result[1]).toEqual({
        execution_id: 'exec-b',
        observedExecution: null,
        observedStatus: 'failed',
      });
    });

    it('uses handler-returned observed state for each resumed prompt in a mixed batch', async () => {
      const observedExecution = makeObservedExecution({
        execution_id: 'exec-a',
        status: 'completed' as any,
      });
      mockHandleFormPromptResponse
        .mockResolvedValueOnce({
          kind: 'resumed',
          observedExecution,
          observedStatus: 'completed',
        })
        .mockResolvedValueOnce({
          kind: 'stale',
          observedExecution: null,
          reason: 'workflow_already_resolved',
          observedStatus: 'completed',
        });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: {
          form_prompts: [
            makeFormPrompt({ execution_id: 'exec-a', id: 'p-a' }),
            makeFormPrompt({ execution_id: 'exec-b', id: 'p-b' }),
          ],
        } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result[0]).toEqual({
        execution_id: 'exec-a',
        observedExecution,
        observedStatus: 'completed',
      });
    });
  });

  describe('[R2] nextFormPrompt propagation', () => {
    it('[R2] propagates nextFormPrompt from handler outcome to ResumedFormPromptState', async () => {
      const nextFormPrompt = {
        execution_id: 'exec-1',
        id: 'step-2',
        message: 'Next question',
        resume_seq: 2,
        schema: { type: 'object' as const },
        step_execution_id: 'step-2',
        type: 'form' as any,
      };
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        nextFormPrompt,
        observedExecution: null,
        observedStatus: 'WAITING_FOR_INPUT',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-1' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result[0].nextFormPrompt).toEqual(nextFormPrompt);
    });

    it('[R2] omits nextFormPrompt when handler outcome has none (terminal or poll-timeout)', async () => {
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution: null,
        observedStatus: 'COMPLETED',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-1' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result[0].nextFormPrompt).toBeUndefined();
    });
  });

  describe('[log trace] [hitl-debug] markers', () => {
    it('emits resumeForms.start with count and execId', async () => {
      const logger = { debug: jest.fn() };

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        logger: logger as any,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-log' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] resumeForms.start'))).toBe(true);
      expect(msgs.some((m: string) => m.includes('count=1'))).toBe(true);
    });

    it('[S1/S2] emits resumeForms.outcome with nextFormPrompt=no on fresh resume without next prompt', async () => {
      const logger = { debug: jest.fn() };
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution: null,
        observedStatus: 'COMPLETED',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        logger: logger as any,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-log' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] resumeForms.outcome'))).toBe(
        true
      );
      expect(msgs.some((m: string) => m.includes('nextFormPrompt=no'))).toBe(true);
    });

    it('[R2] emits resumeForms.outcome with nextFormPrompt=yes when handler returns a next prompt', async () => {
      const logger = { debug: jest.fn() };
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        nextFormPrompt: {
          execution_id: 'exec-1',
          id: 'step-2',
          message: 'Next',
          resume_seq: 2,
          schema: {},
          step_execution_id: 'step-2',
          type: 'form' as any,
        },
        observedExecution: null,
        observedStatus: 'WAITING_FOR_INPUT',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        logger: logger as any,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-1' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] resumeForms.outcome'))).toBe(
        true
      );
      expect(msgs.some((m: string) => m.includes('nextFormPrompt=yes'))).toBe(true);
    });

    it('[S5/R3] emits resumeForms.outcome with kind=stale reason=workflow_already_resolved', async () => {
      const logger = { debug: jest.fn() };
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'stale',
        observedExecution: null,
        observedStatus: 'COMPLETED',
        reason: 'workflow_already_resolved',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        logger: logger as any,
        payload: { form_prompts: [makeFormPrompt({ execution_id: 'exec-log' })] } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('kind=stale'))).toBe(true);
      expect(msgs.some((m: string) => m.includes('reason=workflow_already_resolved'))).toBe(true);
    });
  });

  describe('R-1 smoke: two prompts with same executionId processed independently', () => {
    it('returns two ResumedFormPromptState entries for two prompts with same executionId', async () => {
      const observedExecution = makeObservedExecution({
        execution_id: 'exec-shared',
        status: 'completed' as any,
      });
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution,
        observedStatus: 'completed',
      });

      const { coreSetup, getInternalServices, pluginsSetup, request, spaceId } = makeParams();

      const result = await resumeFormPrompts({
        coreSetup,
        getInternalServices,
        payload: {
          form_prompts: [
            makeFormPrompt({ execution_id: 'exec-shared', id: 'p-1' }),
            makeFormPrompt({ execution_id: 'exec-shared', id: 'p-2' }),
          ],
        } as any,
        pluginsSetup,
        request,
        spaceId,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        execution_id: 'exec-shared',
        observedExecution,
        observedStatus: 'completed',
      });
      expect(result[1]).toEqual({
        execution_id: 'exec-shared',
        observedExecution,
        observedStatus: 'completed',
      });
      expect(mockHandleFormPromptResponse).toHaveBeenCalledTimes(2);
    });
  });
});
