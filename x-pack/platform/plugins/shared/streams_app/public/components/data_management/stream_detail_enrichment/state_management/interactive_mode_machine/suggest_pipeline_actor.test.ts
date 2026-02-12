/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, fromPromise } from 'xstate5';
import { TaskStatus } from '@kbn/streams-schema';
import type { GrokCollection } from '@kbn/grok-ui';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { InteractiveModeParentRef } from './types';
import { interactiveModeMachine } from './interactive_mode_machine';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const settleActor = async () => {
  await flushMicrotasks();
  // XState may schedule internal work on timers even for promise completions
  // (e.g. in tests with fake timers enabled).
  await jest.advanceTimersByTimeAsync(0);
  await flushMicrotasks();
};

const waitForMatch = async (actor: { getSnapshot: () => { matches: (s: string) => boolean; value: unknown } }, match: string) => {
  for (let i = 0; i < 25; i++) {
    if (actor.getSnapshot().matches(match)) return;
    await settleActor();
  }
  throw new Error(`Timed out waiting for ${match}, last value: ${JSON.stringify(actor.getSnapshot().value)}`);
};

const createParentRef = (): InteractiveModeParentRef => {
  return {
    getSnapshot: () => ({
      context: {
        // Not used by the pipeline suggestion tests, but required by the machine.
        simulatorRef: { getSnapshot: () => ({ context: {} }) } as any,
        dataSourcesRefs: [],
        schemaErrors: [],
        validationErrors: new Map(),
      },
    }),
    send: jest.fn(),
  };
};

describe('interactive mode pipeline suggestion polling', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('polls via machine "after" transitions until task completes', async () => {
    jest.useFakeTimers();

    let statusCallCount = 0;
    const getPipelineSuggestionStatusMock = jest.fn(async () => {
      statusCallCount += 1;
      if (statusCallCount <= 2) {
        return { status: TaskStatus.InProgress } as any;
      }
      return { status: TaskStatus.Completed, pipeline: { steps: [] } } as any;
    });

    const loadExistingSuggestionActor = fromPromise(async () => ({ type: 'none' as const }));
    const scheduleTaskActor = fromPromise(async () => undefined);
    const getStatusActor = fromPromise(async () => getPipelineSuggestionStatusMock());

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: loadExistingSuggestionActor,
        schedulePipelineSuggestionTask: scheduleTaskActor,
        getPipelineSuggestionStatus: getStatusActor,
      },
    });

    const input = {
      dsl: { steps: [] } as unknown as StreamlangDSL,
      newStepIds: [],
      parentRef: createParentRef(),
      privileges: { manage: true, simulate: true },
      simulationMode: 'complete' as const,
      streamName: 'logs-generic-default',
      grokCollection: {} as GrokCollection,
    };

    const actor = createActor(testMachine, { input });
    actor.start();

    await waitForMatch(actor, 'pipelineSuggestion.idle');

    actor.send({ type: 'suggestion.generate', connectorId: 'connector-1' });

    await waitForMatch(actor, 'pipelineSuggestion.waitingForCompletion');
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    await settleActor();
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(2);
    await waitForMatch(actor, 'pipelineSuggestion.waitingForCompletion');

    await jest.advanceTimersByTimeAsync(2000);
    await settleActor();
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(3);
    await waitForMatch(actor, 'pipelineSuggestion.completed');

    actor.stop();
  });

  it('stops polling when cancelled while waiting', async () => {
    jest.useFakeTimers();

    const getPipelineSuggestionStatusMock = jest.fn(async () => ({ status: TaskStatus.InProgress } as any));

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise(async () => ({ type: 'none' as const })),
        schedulePipelineSuggestionTask: fromPromise(async () => undefined),
        getPipelineSuggestionStatus: fromPromise(async () => getPipelineSuggestionStatusMock()),
      },
    });

    const input = {
      dsl: { steps: [] } as unknown as StreamlangDSL,
      newStepIds: [],
      parentRef: createParentRef(),
      privileges: { manage: true, simulate: true },
      simulationMode: 'complete' as const,
      streamName: 'logs-generic-default',
      grokCollection: {} as GrokCollection,
    };

    const actor = createActor(testMachine, { input });
    actor.start();

    await waitForMatch(actor, 'pipelineSuggestion.idle');
    actor.send({ type: 'suggestion.generate', connectorId: 'connector-1' });

    await waitForMatch(actor, 'pipelineSuggestion.waitingForCompletion');
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(1);

    actor.send({ type: 'suggestion.cancel' });
    await waitForMatch(actor, 'pipelineSuggestion.idle');

    await jest.advanceTimersByTimeAsync(60_000);
    await settleActor();
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(1);

    actor.stop();
  });
});
