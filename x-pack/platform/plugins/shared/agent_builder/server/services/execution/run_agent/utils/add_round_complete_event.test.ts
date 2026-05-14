/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom, toArray } from 'rxjs';
import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type {
  ConversationRound,
  MessageCompleteEvent,
  RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { ConversationStateManager } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createModelProviderMock } from '../../../../test_utils/model_provider';
import { createRound as makeRound } from '../../../../test_utils/conversations';
import { AgentExecutionEventType } from '../events';
import type { FinalStateEvent } from '../events';
import { addRoundCompleteEvent } from './add_round_complete_event';

import type { FormPromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';

// Minimal mock helpers -------------------------------------------------------

const makeStateManager = (): ConversationStateManager => ({
  getToolStateManager: jest.fn().mockReturnValue({ getState: jest.fn(), setState: jest.fn() }),
});

const makeAttachmentStateManager = (): AttachmentStateManager =>
  ({
    getAccessedRefs: jest.fn().mockReturnValue([]),
    getAll: jest.fn().mockReturnValue([]),
    clearAccessTracking: jest.fn(),
  } as unknown as AttachmentStateManager);

const makeMessageCompleteEvent = (content: string): MessageCompleteEvent => ({
  type: ChatEventType.messageComplete,
  data: { message_content: content, message_id: 'msg-1' },
});

const makeFinalStateEvent = (): FinalStateEvent => ({
  type: AgentExecutionEventType.finalState,
  data: { state: { currentCycle: 0, errorCount: 0 } as any },
});

const makeHitlStaleStep = () =>
  ({
    execution_id: 'exec-1',
    kind: 'hitl_form_response_stale',
    message: 'Please approve',
    observed_status: 'COMPLETED',
    reason: 'workflow_already_resolved',
    schema: {},
    step_execution_id: 'step-1',
    submitted_at: new Date().toISOString(),
    submitted_values: {},
    type: ConversationRoundStepType.other,
  } as unknown as ConversationRound['steps'][number]);

const makeFormPromptRequest = (stepId: string): FormPromptRequest => ({
  execution_id: 'exec-1',
  id: stepId,
  message: `Form for ${stepId}`,
  resume_seq: 1,
  schema: { properties: { approved: { type: 'boolean' } }, type: 'object' },
  step_execution_id: stepId,
  type: AgentPromptType.form,
});

const makeLogger = () => ({ debug: jest.fn(), error: jest.fn() });

const runPipeline = async ({
  pendingRound,
  pendingFormPrompts,
  messageContent,
  logger,
}: {
  pendingRound: ConversationRound | undefined;
  pendingFormPrompts?: FormPromptRequest[];
  messageContent: string;
  logger?: ReturnType<typeof makeLogger>;
}): Promise<RoundCompleteEvent> => {
  const modelProvider = createModelProviderMock();
  const stateManager = makeStateManager();
  const attachmentStateManager = makeAttachmentStateManager();

  // FinalStateEvent must be present for buildRoundState; evictInternalEvents strips it from output
  const events: any[] = [makeMessageCompleteEvent(messageContent), makeFinalStateEvent()];

  const output = await lastValueFrom(
    from(events).pipe(
      addRoundCompleteEvent({
        pendingRound,
        pendingFormPrompts,
        userInput: { message: '' },
        startTime: new Date(),
        modelProvider,
        stateManager,
        getConversationState: jest.fn().mockReturnValue({}),
        attachmentStateManager,
        logger: logger as any,
      }),
      toArray()
    )
  );

  const roundCompleteEvent = output.find(isRoundCompleteEvent);
  if (!roundCompleteEvent) throw new Error('No RoundCompleteEvent in output');
  return roundCompleteEvent;
};

// Tests -----------------------------------------------------------------------

describe('addRoundCompleteEvent — stale HITL fallback message', () => {
  it('uses a fallback message when the LLM produces empty text and a stale form step exists', async () => {
    const pendingRound = makeRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [makeHitlStaleStep()],
    });

    const { data } = await runPipeline({ messageContent: '', pendingRound });

    expect(data.round.response.message).toBe(
      'Your input has been recorded. The workflow continued without it.'
    );
  });

  it('preserves non-empty LLM text even when a stale form step exists', async () => {
    const pendingRound = makeRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [makeHitlStaleStep()],
    });

    const { data } = await runPipeline({
      messageContent: 'The workflow has completed.',
      pendingRound,
    });

    expect(data.round.response.message).toBe('The workflow has completed.');
  });

  it('leaves message empty when there is no stale form step and LLM produces no text', async () => {
    const pendingRound = makeRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [], // no stale step
    });

    const { data } = await runPipeline({ messageContent: '', pendingRound });

    expect(data.round.response.message).toBe('');
  });
});

// ---------------------------------------------------------------------------
// addRoundCompleteEvent — pendingFormPrompts merge / dedup (R2 fix)
// ---------------------------------------------------------------------------

describe('addRoundCompleteEvent — pendingFormPrompts merge (R2)', () => {
  it('merges a new form prompt into pending_prompts and sets status=awaitingPrompt', async () => {
    const pendingRound = makeRound({ steps: [], pending_prompts: [] });
    const newPrompt = makeFormPromptRequest('step-2');

    const { data } = await runPipeline({
      messageContent: 'Done.',
      pendingFormPrompts: [newPrompt],
      pendingRound,
    });

    expect(data.round.pending_prompts).toHaveLength(1);
    expect(data.round.pending_prompts![0].id).toBe('step-2');
    expect(data.round.status).toBe(ConversationRoundStatus.awaitingPrompt);
  });

  it('deduplicates when the same step_execution_id is already in pending_prompts', async () => {
    const existingPrompt = makeFormPromptRequest('step-2');
    const pendingRound = makeRound({
      steps: [],
      pending_prompts: [existingPrompt],
      status: ConversationRoundStatus.awaitingPrompt,
    });
    const duplicatePrompt = makeFormPromptRequest('step-2');

    const { data } = await runPipeline({
      messageContent: 'Done.',
      pendingFormPrompts: [duplicatePrompt],
      pendingRound,
    });

    // Should still have exactly one entry (deduped by id = step_execution_id)
    expect(data.round.pending_prompts).toHaveLength(1);
  });

  it('merges two distinct new prompts into pending_prompts', async () => {
    const pendingRound = makeRound({ steps: [] });

    const { data } = await runPipeline({
      messageContent: 'Done.',
      pendingFormPrompts: [makeFormPromptRequest('step-a'), makeFormPromptRequest('step-b')],
      pendingRound,
    });

    expect(data.round.pending_prompts).toHaveLength(2);
  });

  it('does not set awaitingPrompt when pendingFormPrompts is empty', async () => {
    const pendingRound = makeRound({ steps: [] });

    const { data } = await runPipeline({
      messageContent: 'Done.',
      pendingFormPrompts: [],
      pendingRound,
    });

    expect(data.round.status).not.toBe(ConversationRoundStatus.awaitingPrompt);
  });

  it('[log trace] emits addRound.start and addRound.merge [hitl-debug] markers', async () => {
    const logger = makeLogger();
    const pendingRound = makeRound({ steps: [] });

    await runPipeline({
      messageContent: 'Done.',
      logger,
      pendingFormPrompts: [makeFormPromptRequest('step-2')],
      pendingRound,
    });

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] addRound.start'))).toBe(true);
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] addRound.merge'))).toBe(true);
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] addRound.awaitingPrompt'))).toBe(
      true
    );
  });

  it('removes stale form prompts from pending_prompts before merging new prompts', async () => {
    // step-1 was submitted as stale → recorded as a hitl_form_response_stale audit step
    const staleStep = makeHitlStaleStep(); // step_execution_id = 'step-1'
    const staleForm = makeFormPromptRequest('step-1'); // the pending form that became stale
    const pendingRound = makeRound({
      pending_prompts: [staleForm],
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [staleStep],
    });
    const newPrompt = makeFormPromptRequest('step-2'); // new active step

    const { data } = await runPipeline({
      messageContent: 'Done.',
      pendingFormPrompts: [newPrompt],
      pendingRound,
    });

    // step-1 must be evicted; only step-2 should remain active
    expect(data.round.pending_prompts).toHaveLength(1);
    expect(data.round.pending_prompts![0].id).toBe('step-2');
  });

  it('[log trace] emits addRound.merge with post=pre when all prompts are duplicates', async () => {
    const logger = makeLogger();
    const existingPrompt = makeFormPromptRequest('step-dup');
    const pendingRound = makeRound({
      steps: [],
      pending_prompts: [existingPrompt],
    });

    await runPipeline({
      messageContent: 'Done.',
      logger,
      pendingFormPrompts: [makeFormPromptRequest('step-dup')],
      pendingRound,
    });

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    expect(msgs.some((m: string) => m.includes('all_dupes'))).toBe(true);
  });
});
