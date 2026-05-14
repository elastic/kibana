/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { FormPromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionStaleResumeError,
} from '@kbn/workflows/common/errors';
import {
  createConversationClientMock,
  createEmptyConversation,
  createRound,
} from '../../../../test_utils/conversations';
import type { ConversationClientMock } from '../../../../test_utils/conversations';

// --- Mocks -------------------------------------------------------------------

jest.mock('./poll_for_workflow_advance', () => ({
  pollForWorkflowAdvance: jest.fn(),
}));

// Mock the fallback getExecutionState used when no logger is provided.
jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  getExecutionState: jest.fn().mockResolvedValue(null),
}));

jest.mock('@kbn/workflows-hitl-telemetry', () => ({
  HITL_EVENT_TYPES: {
    responded: 'hitl.responded',
    created: 'hitl.created',
    timedOut: 'hitl.timed_out',
  },
  reportHitlEvent: jest.fn(),
}));

import { pollForWorkflowAdvance } from './poll_for_workflow_advance';
import { handleFormPromptResponse } from './handle_form_prompt';

const mockPoll = pollForWorkflowAdvance as jest.MockedFn<typeof pollForWorkflowAdvance>;

// --- Fixtures ----------------------------------------------------------------

const EXEC_ID = 'exec-1';
const STEP_ID_1 = 'step-1';
const STEP_ID_2 = 'step-2';
const CONV_ID = 'conv-1';
const SPACE_ID = 'default';
const REQUEST = {} as KibanaRequest;

const makeFormPromptRequest = (overrides: Partial<FormPromptRequest> = {}): FormPromptRequest => ({
  execution_id: EXEC_ID,
  id: STEP_ID_1,
  message: 'Please approve',
  resume_seq: 0,
  schema: { properties: { approved: { type: 'boolean' } }, type: 'object' },
  step_execution_id: STEP_ID_1,
  type: AgentPromptType.form,
  ...overrides,
});

const makeExecution = (
  overrides: Partial<WorkflowExecutionState> = {}
): WorkflowExecutionState => ({
  execution_id: EXEC_ID,
  resume_seq: 1,
  started_at: '2026-01-01T00:00:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  workflow_id: 'wf-1',
  waiting_input: {
    message: 'Step 2 question',
    schema: {},
    step_execution_id: STEP_ID_2,
  },
  ...overrides,
});

const makeWorkflowApi = (opts: { throws?: Error } = {}) => ({
  resumeWorkflowExecution: jest.fn().mockImplementation(async () => {
    if (opts.throws) throw opts.throws;
  }),
});

const makeLogger = () => ({
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
});

/** Build a ConversationClient whose conversation contains one round with a form prompt. */
const makeConversationClientWithPrompt = (
  prompt: FormPromptRequest = makeFormPromptRequest()
): ConversationClientMock => {
  const client = createConversationClientMock();
  const round = createRound({
    status: ConversationRoundStatus.awaitingPrompt,
    pending_prompts: [prompt],
    steps: [],
  });
  client.get.mockResolvedValue(createEmptyConversation({ rounds: [round] }));
  client.update.mockResolvedValue(undefined as any);
  return client;
};

/** Build a ConversationClient whose conversation has NO matching form prompt. */
const makeConversationClientWithoutPrompt = (): ConversationClientMock => {
  const client = createConversationClientMock();
  const round = createRound({ steps: [], pending_prompts: [] });
  client.get.mockResolvedValue(createEmptyConversation({ rounds: [round] }));
  return client;
};

// --- Tests -------------------------------------------------------------------

describe('handleFormPromptResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // No conversation context — legacy direct-resume path
  // -------------------------------------------------------------------------
  describe('no conversation context (direct resume)', () => {
    it('resumes the workflow directly and returns resumed with null observedExecution', async () => {
      const workflowApi = makeWorkflowApi();
      const result = await handleFormPromptResponse({
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: { approved: true } },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXEC_ID,
        SPACE_ID,
        { approved: true },
        REQUEST
      );
      expect(result).toEqual({
        kind: 'resumed',
        observedExecution: null,
        observedStatus: 'unknown',
      });
    });

    it('does not call pollForWorkflowAdvance when there is no conversation context', async () => {
      const workflowApi = makeWorkflowApi();
      await handleFormPromptResponse({
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(mockPoll).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // S8: early return — prompt already cleared from pending_prompts
  // -------------------------------------------------------------------------
  describe('[S8] early return — prompt already cleared', () => {
    it('returns stale without calling resumeWorkflowExecution when the prompt is absent', async () => {
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithoutPrompt();

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
      expect(result.kind).toBe('stale');
    });

    it('logs handleForm.earlyReturn when the prompt is absent', async () => {
      const logger = makeLogger();
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithoutPrompt();

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: logger as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const calls = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(calls.some((m: string) => m.includes('handleForm.earlyReturn'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // S7: legacy path — no resume_seq on the prompt
  // -------------------------------------------------------------------------
  describe('[S7] legacy path — no resume_seq', () => {
    it('calls resumeWorkflowExecution without expectedResumeSeq when prompt has no resume_seq', async () => {
      const prompt = makeFormPromptRequest({ resume_seq: undefined as any });
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt(prompt);
      mockPoll.mockResolvedValue(null);

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      // Should call resumeWorkflowExecution with only 4 args (no options object)
      expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXEC_ID,
        SPACE_ID,
        {},
        REQUEST,
        undefined
      );
    });
  });

  // -------------------------------------------------------------------------
  // C4: fresh path — CAS wins, workflow resumes
  // -------------------------------------------------------------------------
  describe('[C4] fresh path — CAS wins', () => {
    it('returns kind=resumed with nextFormPrompt when poll observes a new step (S1 fast TM)', async () => {
      const step2Execution = makeExecution();
      mockPoll.mockResolvedValue(step2Execution);
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt();

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: { approved: true } },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('resumed');
      if (result.kind === 'resumed') {
        expect(result.nextFormPrompt?.step_execution_id).toBe(STEP_ID_2);
        expect(result.observedExecution).toBe(step2Execution);
        expect(result.observedStatus).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      }
    });

    it('calls resumeWorkflowExecution with expectedResumeSeq derived from prompt.resume_seq', async () => {
      mockPoll.mockResolvedValue(null);
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt(
        makeFormPromptRequest({ resume_seq: 3 })
      );

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXEC_ID,
        SPACE_ID,
        {},
        REQUEST,
        { expectedResumeSeq: 4 }
      );
    });

    it('appends a hitl_form_response audit step after successful resume', async () => {
      mockPoll.mockResolvedValue(null);
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt();

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: { approved: true } },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(conversationClient.update).toHaveBeenCalled();
      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      const auditStep = updatedConv.rounds[0].steps.find(
        (s: { kind?: string }) => s.kind === 'hitl_form_response'
      );
      expect(auditStep).toBeDefined();
      expect(auditStep.values).toEqual({ approved: true });
      expect(auditStep.type).toBe(ConversationRoundStepType.other);
    });

    it('[S1 log trace] emits canonical [hitl-debug] markers in correct sequence for fast TM', async () => {
      const step2Execution = makeExecution();
      mockPoll.mockResolvedValue(step2Execution);
      const logger = makeLogger();
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt();

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: logger as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );

      const indexOf = (marker: string) => msgs.findIndex((m: string) => m.includes(marker));

      expect(indexOf('handleForm.start')).toBeGreaterThanOrEqual(0);
      expect(indexOf('classify.preCheck.state')).toBeGreaterThan(indexOf('handleForm.start'));
      expect(indexOf('resume.workflowApi.call')).toBeGreaterThan(
        indexOf('classify.preCheck.state')
      );
      expect(indexOf('resume.workflowApi.return')).toBeGreaterThan(
        indexOf('resume.workflowApi.call')
      );
      expect(indexOf('classify.result')).toBeGreaterThan(indexOf('resume.workflowApi.return'));
      expect(
        msgs.some((m: string) => m.includes('classify.result') && m.includes('kind=fresh'))
      ).toBe(true);
      expect(indexOf('audit.fresh.append')).toBeGreaterThan(indexOf('classify.result'));
      expect(indexOf('nextPrompt.build')).toBeGreaterThan(indexOf('audit.fresh.append'));
      expect(
        msgs.some((m: string) => m.includes('nextPrompt.build') && m.includes('fromPath=fresh'))
      ).toBe(true);
    });

    it('[S9] emits nextPrompt.skip reason=observedNull when poll times out', async () => {
      mockPoll.mockResolvedValue(null);
      const logger = makeLogger();
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt();

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: logger as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('resumed');
      if (result.kind === 'resumed') {
        expect(result.nextFormPrompt).toBeUndefined();
      }

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(
        msgs.some((m: string) => m.includes('nextPrompt.skip') && m.includes('reason=observedNull'))
      ).toBe(true);
    });

    it('returns nextFormPrompt=undefined when poll observes a terminal status (S3/S4)', async () => {
      const completedExecution = makeExecution({
        status: ExecutionStatus.COMPLETED,
        waiting_input: undefined,
      });
      mockPoll.mockResolvedValue(completedExecution);
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt();

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('resumed');
      if (result.kind === 'resumed') {
        expect(result.nextFormPrompt).toBeUndefined();
        expect(result.observedStatus).toBe(ExecutionStatus.COMPLETED);
      }
    });
  });

  // -------------------------------------------------------------------------
  // R3/S5: CAS fails — concurrent_resume
  // -------------------------------------------------------------------------
  describe('[R3/S5] CAS fail — concurrent_resume', () => {
    it('returns kind=stale reason=concurrent_resume when workflow is still WAITING_FOR_INPUT on same step', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      const sameStepExecution = makeExecution({
        waiting_input: {
          message: 'Still step 1',
          schema: {},
          step_execution_id: STEP_ID_1, // same step
        },
        resume_seq: 2,
      });
      mockPoll.mockResolvedValue(sameStepExecution);

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.reason).toBe('concurrent_resume');
        expect(result.nextFormPrompt).toBeUndefined();
      }
    });

    it('appends a hitl_form_response_stale audit step on CAS fail', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(null);

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: { approved: false } },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      const auditStep = updatedConv.rounds[0].steps.find(
        (s: { kind?: string }) => s.kind === 'hitl_form_response_stale'
      );
      expect(auditStep).toBeDefined();
      expect(auditStep.type).toBe(ConversationRoundStepType.other);
    });

    it('[R3 log trace] emits classify.result kind=stale and audit.stale.append on CAS fail', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const logger = makeLogger();
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(null);

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: logger as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(
        msgs.some((m: string) => m.includes('resume.workflowApi.return') && m.includes('ok=false'))
      ).toBe(true);
      expect(
        msgs.some((m: string) => m.includes('classify.result') && m.includes('kind=stale'))
      ).toBe(true);
      expect(msgs.some((m: string) => m.includes('audit.stale.append'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // R3/S5–S6: CAS fails but workflow advanced to new step (C5 stale path)
  // -------------------------------------------------------------------------
  describe('[R3/S5/C5] CAS fail — workflow_advanced_to_new_prompt with next form', () => {
    it('returns nextFormPrompt for step-2 when poll observes a new step after CAS fail (R2+R3 fix)', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      const step2Execution = makeExecution(); // has step_execution_id = STEP_ID_2
      mockPoll.mockResolvedValue(step2Execution);

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.nextFormPrompt?.step_execution_id).toBe(STEP_ID_2);
        expect(result.nextFormPrompt?.execution_id).toBe(EXEC_ID);
      }
    });

    it('[R3 stale path log trace] emits nextPrompt.build fromPath=stale after CAS fail + poll advance', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const logger = makeLogger();
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(makeExecution());

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: logger as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(
        msgs.some((m: string) => m.includes('nextPrompt.build') && m.includes('fromPath=stale'))
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // CAS fail — workflow_already_resolved (terminal status observed)
  // -------------------------------------------------------------------------
  describe('[R3/S6] CAS fail — workflow_already_resolved', () => {
    it('returns reason=workflow_already_resolved when observed status is terminal', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      const completedExecution = makeExecution({
        status: ExecutionStatus.COMPLETED,
        waiting_input: undefined,
      });
      mockPoll.mockResolvedValue(completedExecution);

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.reason).toBe('workflow_already_resolved');
        expect(result.observedStatus).toBe(ExecutionStatus.COMPLETED);
      }
    });
  });

  // -------------------------------------------------------------------------
  // InvalidStatus error (Window 2 — terminal status materialized before CAS)
  // -------------------------------------------------------------------------
  // When TaskManager has already run the final workflow step, the execution
  // transitions to 'completed' BEFORE the Agent Builder stale submit arrives.
  // The engine's status guard (plugin.ts:1236) fires before CAS and throws
  // WorkflowExecutionInvalidStatusError instead of WorkflowExecutionStaleResumeError.
  // handleFormPromptResponse must treat this the same as a CAS-lost stale resume —
  // recording a hitl_form_response_stale audit with reason=workflow_already_resolved,
  // sealing the round, and returning kind='stale' rather than propagating a 500.
  describe('[R3/S6b] InvalidStatus error (Window 2 — terminal status before CAS) treated as stale', () => {
    it('returns kind=stale with reason=workflow_already_resolved when engine throws WorkflowExecutionInvalidStatusError', async () => {
      const invalidStatusError = new WorkflowExecutionInvalidStatusError(
        EXEC_ID,
        'completed',
        'waiting_for_input'
      );
      const workflowApi = makeWorkflowApi({ throws: invalidStatusError });
      const conversationClient = makeConversationClientWithPrompt();
      const completedExecution = makeExecution({
        status: ExecutionStatus.COMPLETED,
        waiting_input: undefined,
      });
      mockPoll.mockResolvedValue(completedExecution);

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.reason).toBe('workflow_already_resolved');
        expect(result.observedStatus).toBe(ExecutionStatus.COMPLETED);
      }
    });

    it('seals the round (status=completed) when WorkflowExecutionInvalidStatusError thrown', async () => {
      const invalidStatusError = new WorkflowExecutionInvalidStatusError(
        EXEC_ID,
        'completed',
        'waiting_for_input'
      );
      const workflowApi = makeWorkflowApi({ throws: invalidStatusError });
      const conversationClient = makeConversationClientWithPrompt();
      const completedExecution = makeExecution({
        status: ExecutionStatus.COMPLETED,
        waiting_input: undefined,
      });
      mockPoll.mockResolvedValue(completedExecution);

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      expect(updatedConv.rounds[0].status).toBe(ConversationRoundStatus.completed);
      expect(updatedConv.rounds[0].pending_prompts).toBeUndefined();
    });

    it('appends a hitl_form_response_stale audit step when WorkflowExecutionInvalidStatusError thrown', async () => {
      const invalidStatusError = new WorkflowExecutionInvalidStatusError(
        EXEC_ID,
        'completed',
        'waiting_for_input'
      );
      const workflowApi = makeWorkflowApi({ throws: invalidStatusError });
      const conversationClient = makeConversationClientWithPrompt();
      const completedExecution = makeExecution({
        status: ExecutionStatus.COMPLETED,
        waiting_input: undefined,
      });
      mockPoll.mockResolvedValue(completedExecution);

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      const auditStep = updatedConv.rounds[0].steps.find(
        (s: { type: string; kind?: string }) => s.kind === 'hitl_form_response_stale'
      );
      expect(auditStep).toBeDefined();
      expect(auditStep.type).toBe(ConversationRoundStepType.other);
      expect(auditStep.reason).toBe('workflow_already_resolved');
    });

    it('still re-throws a plain Error (not InvalidStatus or StaleResume)', async () => {
      const networkError = new Error('network failure');
      const workflowApi = makeWorkflowApi({ throws: networkError });
      const conversationClient = makeConversationClientWithPrompt();

      await expect(
        handleFormPromptResponse({
          conversationClient,
          conversationId: CONV_ID,
          formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
          logger: makeLogger() as any,
          request: REQUEST,
          spaceId: SPACE_ID,
          workflowApi: workflowApi as any,
        })
      ).rejects.toThrow('network failure');
    });
  });

  // -------------------------------------------------------------------------
  // CAS fail — workflow_advanced (new step observed after concurrent approver)
  // -------------------------------------------------------------------------
  describe('[R3/S5] CAS fail — workflow_advanced', () => {
    it('returns reason=workflow_advanced when poll observes a new step after CAS fail', async () => {
      // Scenario: user A approved step 1 via Workflow UI (no CAS), user B's AB
      // submission races and loses CAS. After losing, the poll observes step 2
      // (WAITING_FOR_INPUT with a DIFFERENT step_execution_id). The classifier must
      // pick `workflow_advanced` so the LLM's narrative correctly states "the
      // workflow moved on" rather than "still waiting on the same approval".
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      // makeExecution() defaults: status=WAITING_FOR_INPUT, step_execution_id=STEP_ID_2
      // The prompt's step_execution_id is STEP_ID_1 (from makeConversationClientWithPrompt).
      // Different IDs → must classify as workflow_advanced.
      mockPoll.mockResolvedValue(makeExecution());

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.reason).toBe('workflow_advanced');
      }
    });

    it('includes the observed execution so refreshStaleWorkflowExecution gets correct step context', async () => {
      // Without observedExecution in the stale outcome, resumeFormPrompts passes null
      // to ResumedFormPromptState, causing refreshStaleWorkflowExecution to call
      // buildFreshExecution (no step_execution_id). The LLM then lacks the step2 context
      // and regenerates the initial "workflow started at step 1" narrative instead of
      // acknowledging that the workflow has advanced.
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      const step2Execution = makeExecution();

      mockPoll.mockResolvedValue(step2Execution);

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.observedExecution).toBe(step2Execution);
      }
    });

    it('still returns reason=concurrent_resume when poll observes the SAME step still waiting', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      // Same step id (STEP_ID_1) still waiting → must NOT classify as workflow_advanced.
      mockPoll.mockResolvedValue(
        makeExecution({
          waiting_input: { message: 'retry', schema: {}, step_execution_id: STEP_ID_1 },
        })
      );

      const result = await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(result.kind).toBe('stale');
      if (result.kind === 'stale') {
        expect(result.reason).toBe('concurrent_resume');
      }
    });

    // -----------------------------------------------------------------------
    // Round sealing: workflow_advanced must seal the round so that
    // addRoundCompleteEvent creates a new round (not merges into this one).
    // -----------------------------------------------------------------------

    it('seals the round (status=completed) when workflow advances to a new step', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(makeExecution()); // workflow_advanced: STEP_ID_2 ≠ STEP_ID_1

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      expect(updatedConv.rounds[0].status).toBe(ConversationRoundStatus.completed);
    });

    it('clears pending_prompts when workflow advances to a new step', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(makeExecution());

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      expect(updatedConv.rounds[0].pending_prompts).toBeUndefined();
    });

    it('does NOT seal the round when reason=concurrent_resume (round stays awaitingPrompt)', async () => {
      // Contrasting test: same step still waiting → do NOT seal.
      // The user may retry on the same round.
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(
        makeExecution({
          waiting_input: { message: 'retry', schema: {}, step_execution_id: STEP_ID_1 },
        })
      );

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      const updatedConv = (conversationClient.update as jest.Mock).mock.calls[0][0];
      expect(updatedConv.rounds[0].status).toBe(ConversationRoundStatus.awaitingPrompt);
    });
  });

  // -------------------------------------------------------------------------
  // pollForWorkflowAdvance is called on the stale path (R1 fix on stale)
  // -------------------------------------------------------------------------
  describe('[R1] pollForWorkflowAdvance called on both fresh and stale paths', () => {
    it('calls pollForWorkflowAdvance with previousStepExecutionId after fresh resume', async () => {
      mockPoll.mockResolvedValue(null);
      const workflowApi = makeWorkflowApi();
      const conversationClient = makeConversationClientWithPrompt(
        makeFormPromptRequest({ step_execution_id: STEP_ID_1 })
      );

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(mockPoll).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: EXEC_ID,
          previousStepExecutionId: STEP_ID_1,
        })
      );
    });

    it('calls pollForWorkflowAdvance on the stale path (CAS fail)', async () => {
      const staleError = new WorkflowExecutionStaleResumeError(EXEC_ID, 1, 2);
      const workflowApi = makeWorkflowApi({ throws: staleError });
      const conversationClient = makeConversationClientWithPrompt();
      mockPoll.mockResolvedValue(null);

      await handleFormPromptResponse({
        conversationClient,
        conversationId: CONV_ID,
        formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
        logger: makeLogger() as any,
        request: REQUEST,
        spaceId: SPACE_ID,
        workflowApi: workflowApi as any,
      });

      expect(mockPoll).toHaveBeenCalledWith(expect.objectContaining({ executionId: EXEC_ID }));
    });
  });

  // -------------------------------------------------------------------------
  // Non-stale error is re-thrown
  // -------------------------------------------------------------------------
  describe('non-stale error is re-thrown', () => {
    it('re-throws errors that are not WorkflowExecutionStaleResumeError', async () => {
      const networkError = new Error('network failure');
      const workflowApi = makeWorkflowApi({ throws: networkError });
      const conversationClient = makeConversationClientWithPrompt();

      await expect(
        handleFormPromptResponse({
          conversationClient,
          conversationId: CONV_ID,
          formPromptResponse: { execution_id: EXEC_ID, id: 'p1', values: {} },
          request: REQUEST,
          spaceId: SPACE_ID,
          workflowApi: workflowApi as any,
        })
      ).rejects.toThrow('network failure');
    });
  });
});
