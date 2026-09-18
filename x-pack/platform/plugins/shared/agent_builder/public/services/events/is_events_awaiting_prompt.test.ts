/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEventsAwaitingPrompt } from './is_events_awaiting_prompt';
import {
  createExecutionTerminatedEvent,
  createPromptRequestedTerminatedEvent,
} from '../../application/components/conversations/timeline/items/execution_terminated_event.factory';
import { createExecutionFailedEvent } from '../../application/components/conversations/timeline/items/execution_failed_event.factory';
import { createPromptResponseEvent } from '../../application/components/conversations/timeline/items/prompt_response_event.factory';

describe('isEventsAwaitingPrompt', () => {
  const paused = createPromptRequestedTerminatedEvent({
    id: 'term-paused',
    execution_id: 'exec-1',
  });

  it('is false for an empty conversation', () => {
    expect(isEventsAwaitingPrompt([])).toBe(false);
  });

  it('is true when the latest terminal is an unanswered prompt pause', () => {
    expect(isEventsAwaitingPrompt([paused])).toBe(true);
  });

  it('is false once a persisted answer targets that pause', () => {
    const answer = createPromptResponseEvent({
      id: 'response-1',
      data: { prompt_requested_event_id: 'term-paused', responses: {} },
    });
    expect(isEventsAwaitingPrompt([paused, answer])).toBe(false);
  });

  it('is false when only a local answer targets that pause (resuming)', () => {
    const localAnswer = createPromptResponseEvent({
      id: 'local',
      data: { prompt_requested_event_id: 'term-paused', responses: {} },
    });
    expect(isEventsAwaitingPrompt([paused], localAnswer)).toBe(false);
  });

  it('is false when the latest terminal is a responded run', () => {
    const responded = createExecutionTerminatedEvent({ id: 'term-done', execution_id: 'exec-2' });
    expect(isEventsAwaitingPrompt([paused, responded])).toBe(false);
  });

  it('is true for a chained pause where an earlier answer does not resolve the newest pause', () => {
    const answerA = createPromptResponseEvent({
      id: 'response-a',
      data: { prompt_requested_event_id: 'term-paused', responses: {} },
    });
    const pausedB = createPromptRequestedTerminatedEvent({
      id: 'term-paused-b',
      execution_id: 'exec-1::execution::1',
    });
    expect(isEventsAwaitingPrompt([paused, answerA, pausedB])).toBe(true);
  });

  it('is false when the latest terminal is a failure', () => {
    const failed = createExecutionFailedEvent({ id: 'term-failed', execution_id: 'exec-3' });
    expect(isEventsAwaitingPrompt([paused, failed])).toBe(false);
  });
});
