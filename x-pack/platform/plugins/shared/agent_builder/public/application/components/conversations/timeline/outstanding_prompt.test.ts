/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { TimelineDisplayEvent } from '../../../../services/events';
import { findOutstandingPrompt, requestedPrompts } from './outstanding_prompt';
import { createExecutionPausedEvent } from './items/execution_paused_event.factory';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import { createExecutionAbortedEvent } from './items/execution_aborted_event.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';

const ROUND_ID = 'round-1';
const PAUSE_EVENT_ID = `${ROUND_ID}::execution_terminated`;
const PROMPT_RESPONSE_ID = `${ROUND_ID}::prompt_response::1`;
const RESUME_EXECUTION_ID = `${ROUND_ID}::execution::1`;
const AGENT_ACTOR = { type: EventActorType.agent, id: 'agent-1' };

const pauseEvent = (): TimelineDisplayEvent =>
  createExecutionPausedEvent({
    id: PAUSE_EVENT_ID,
    execution_id: `${ROUND_ID}::execution`,
  }) as TimelineDisplayEvent;

const promptResponse = (): TimelineDisplayEvent =>
  createPromptResponseEvent({
    id: PROMPT_RESPONSE_ID,
    data: {
      prompt_requested_event_id: PAUSE_EVENT_ID,
      responses: { 'prompt-1': { allow: true } },
    },
  }) as TimelineDisplayEvent;

const resumeStarted = (): TimelineDisplayEvent =>
  ({
    id: `${RESUME_EXECUTION_ID}::execution_started`,
    type: TimelineEventType.executionStarted,
    created_at: '2026-01-01T00:01:00.000Z',
    actor: AGENT_ACTOR,
    execution_id: RESUME_EXECUTION_ID,
    trigger_event_id: PROMPT_RESPONSE_ID,
    data: { trigger_type: 'prompt_response' },
  } as TimelineDisplayEvent);

const resumeTerminated = (): TimelineDisplayEvent =>
  createExecutionTerminatedEvent({
    id: `${RESUME_EXECUTION_ID}::execution_terminated`,
    execution_id: RESUME_EXECUTION_ID,
    trigger_event_id: PROMPT_RESPONSE_ID,
  }) as TimelineDisplayEvent;

const resumeAborted = (): TimelineDisplayEvent =>
  createExecutionAbortedEvent({
    id: `${RESUME_EXECUTION_ID}::execution_aborted`,
    execution_id: RESUME_EXECUTION_ID,
    trigger_event_id: PROMPT_RESPONSE_ID,
  }) as TimelineDisplayEvent;

describe('requestedPrompts', () => {
  it('returns prompts for a paused execution_terminated', () => {
    const event = createExecutionPausedEvent() as TimelineDisplayEvent;
    expect(requestedPrompts(event)).toHaveLength(1);
    expect(requestedPrompts(event)[0].type).toBe(AgentPromptType.confirmation);
  });

  it('returns [] for a non-paused execution_terminated', () => {
    const event = createExecutionTerminatedEvent() as TimelineDisplayEvent;
    expect(requestedPrompts(event)).toEqual([]);
  });

  it('returns [] for non-terminal events', () => {
    const event = resumeStarted();
    expect(requestedPrompts(event)).toEqual([]);
  });
});

describe('findOutstandingPrompt', () => {
  it('returns undefined when there are no events', () => {
    expect(findOutstandingPrompt([])).toBeUndefined();
  });

  it('returns the pause when no prompt_response has answered it (fresh pause)', () => {
    const result = findOutstandingPrompt([pauseEvent()]);
    expect(result).toEqual({ promptRequestedEventId: PAUSE_EVENT_ID, prompts: expect.any(Array) });
  });

  it('returns undefined when prompt_response is present but no execution_started yet (optimistic answer)', () => {
    const result = findOutstandingPrompt([pauseEvent(), promptResponse()]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when resume is running (no terminal yet)', () => {
    const result = findOutstandingPrompt([pauseEvent(), promptResponse(), resumeStarted()]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when resume completed successfully', () => {
    const result = findOutstandingPrompt([
      pauseEvent(),
      promptResponse(),
      resumeStarted(),
      resumeTerminated(),
    ]);
    expect(result).toBeUndefined();
  });

  it('returns the pause when resume ended in abort (pause is still outstanding)', () => {
    const result = findOutstandingPrompt([
      pauseEvent(),
      promptResponse(),
      resumeStarted(),
      resumeAborted(),
    ]);
    expect(result).toEqual({ promptRequestedEventId: PAUSE_EVENT_ID, prompts: expect.any(Array) });
  });

  it('returns undefined when a retry answer follows an aborted resume (retry in progress)', () => {
    const retryPromptResponse: TimelineDisplayEvent = createPromptResponseEvent({
      id: `${ROUND_ID}::prompt_response::2`,
      data: {
        prompt_requested_event_id: PAUSE_EVENT_ID,
        responses: { 'prompt-1': { allow: true } },
      },
    }) as TimelineDisplayEvent;

    const result = findOutstandingPrompt([
      pauseEvent(),
      promptResponse(),
      resumeStarted(),
      resumeAborted(),
      retryPromptResponse,
    ]);

    expect(result).toBeUndefined();
  });

  it('returns the pause after retry: second prompt_response + aborted second resume', () => {
    const secondPromptResponseId = `${ROUND_ID}::prompt_response::2`;
    const secondResumeId = `${ROUND_ID}::execution::2`;

    const secondPromptResponse: TimelineDisplayEvent = createPromptResponseEvent({
      id: secondPromptResponseId,
      data: {
        prompt_requested_event_id: PAUSE_EVENT_ID,
        responses: { 'prompt-1': { allow: true } },
      },
    }) as TimelineDisplayEvent;

    const secondResumeStarted: TimelineDisplayEvent = {
      id: `${secondResumeId}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:02:00.000Z',
      actor: AGENT_ACTOR,
      execution_id: secondResumeId,
      trigger_event_id: secondPromptResponseId,
      data: { trigger_type: 'prompt_response' },
    } as TimelineDisplayEvent;

    const secondResumeAborted: TimelineDisplayEvent = createExecutionAbortedEvent({
      id: `${secondResumeId}::execution_aborted`,
      execution_id: secondResumeId,
      trigger_event_id: secondPromptResponseId,
    }) as TimelineDisplayEvent;

    const result = findOutstandingPrompt([
      pauseEvent(),
      promptResponse(),
      resumeStarted(),
      resumeAborted(),
      secondPromptResponse,
      secondResumeStarted,
      secondResumeAborted,
    ]);

    expect(result).toEqual({ promptRequestedEventId: PAUSE_EVENT_ID, prompts: expect.any(Array) });
  });
});
