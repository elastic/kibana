/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createExecutionFailedEvent } from './items/execution_failed_event.factory';
import {
  createConfirmationPrompt,
  createExecutionPausedEvent,
} from './items/execution_paused_event.factory';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import { answeredPauseIds, findOutstandingPrompt, pausePrompts } from './outstanding_prompt';

const PAUSE_ID = 'round-1::execution_terminated';

describe('pausePrompts', () => {
  it('reads the prompts off a saved pause', () => {
    const paused = createExecutionPausedEvent({ id: PAUSE_ID });
    expect(pausePrompts(paused)).toEqual([createConfirmationPrompt()]);
  });

  it('finds no prompts on a run that answered', () => {
    expect(pausePrompts(createExecutionTerminatedEvent())).toEqual([]);
  });
});

describe('answeredPauseIds', () => {
  it('collects the pause each answer joins back to', () => {
    const events = [
      createExecutionPausedEvent({ id: PAUSE_ID }),
      createPromptResponseEvent({ data: { prompt_requested_event_id: PAUSE_ID, responses: {} } }),
    ];
    expect(answeredPauseIds(events)).toEqual(new Set([PAUSE_ID]));
  });
});

describe('findOutstandingPrompt', () => {
  it('reports the prompts of a saved pause, so a reload restores it', () => {
    const events = [createExecutionStartedEvent(), createExecutionPausedEvent({ id: PAUSE_ID })];

    expect(findOutstandingPrompt(events)).toEqual({
      pauseEventId: PAUSE_ID,
      prompts: [createConfirmationPrompt()],
    });
  });

  it('reports nothing once the pause has an answer', () => {
    const events = [
      createExecutionPausedEvent({ id: PAUSE_ID }),
      createPromptResponseEvent({ data: { prompt_requested_event_id: PAUSE_ID, responses: {} } }),
    ];

    expect(findOutstandingPrompt(events)).toBeUndefined();
  });

  it('reports nothing when the run answered instead of pausing', () => {
    expect(findOutstandingPrompt([createExecutionTerminatedEvent()])).toBeUndefined();
  });

  it('reports nothing when a later run has already ended', () => {
    const events = [
      createExecutionPausedEvent({ id: PAUSE_ID }),
      createPromptResponseEvent({ data: { prompt_requested_event_id: PAUSE_ID, responses: {} } }),
      createExecutionFailedEvent({ id: 'round-1::execution::1::execution_terminated' }),
    ];

    expect(findOutstandingPrompt(events)).toBeUndefined();
  });

  it('reports nothing for an empty timeline', () => {
    expect(findOutstandingPrompt([])).toBeUndefined();
  });
});
