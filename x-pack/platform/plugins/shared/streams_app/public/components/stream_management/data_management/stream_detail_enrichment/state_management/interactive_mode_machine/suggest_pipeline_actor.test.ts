/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, fromPromise, type AnyActorRef } from 'xstate';
import { TaskStatus } from '@kbn/streams-schema';
import type { GrokCollection } from '@kbn/grok-ui';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { SimulationActorRef } from '../simulation_state_machine';
import type { InteractiveModeParentRef } from './types';
import { interactiveModeMachine } from './interactive_mode_machine';
import type {
  LoadExistingSuggestionResult,
  LoadExistingSuggestionInputMinimal,
  SchedulePipelineSuggestionTaskInputMinimal,
  GetPipelineSuggestionStatusInputMinimal,
  PipelineSuggestionTaskStatusResult,
} from './suggest_pipeline_actor';

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

const waitForMatch = async (actor: AnyActorRef, match: string) => {
  for (let i = 0; i < 25; i++) {
    const snapshot = actor.getSnapshot();
    if ('matches' in snapshot && typeof snapshot.matches === 'function' && snapshot.matches(match))
      return;
    await settleActor();
  }
  throw new Error(
    `Timed out waiting for ${match}, last value: ${JSON.stringify(actor.getSnapshot().value)}`
  );
};

const createParentRef = (): InteractiveModeParentRef => {
  return {
    getSnapshot: () => ({
      context: {
        // Not used by the pipeline suggestion tests, but required by the machine.
        // Use a minimal mock cast via unknown to satisfy the type without pulling in full xstate deps
        simulatorRef: { getSnapshot: () => ({ context: {} }) } as unknown as SimulationActorRef,
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
        return { status: TaskStatus.InProgress } as PipelineSuggestionTaskStatusResult;
      }
      return {
        status: TaskStatus.Completed,
        pipeline: { steps: [] },
      } as PipelineSuggestionTaskStatusResult;
    });

    const loadExistingSuggestionActor = fromPromise<
      LoadExistingSuggestionResult,
      LoadExistingSuggestionInputMinimal
    >(async () => ({ type: 'none' as const }));
    const scheduleTaskActor = fromPromise<void, SchedulePipelineSuggestionTaskInputMinimal>(
      async () => {}
    );
    const getStatusActor = fromPromise<
      PipelineSuggestionTaskStatusResult,
      GetPipelineSuggestionStatusInputMinimal
    >(async () => getPipelineSuggestionStatusMock());

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

    const getPipelineSuggestionStatusMock = jest.fn(
      async () => ({ status: TaskStatus.InProgress } as PipelineSuggestionTaskStatusResult)
    );

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise<
          LoadExistingSuggestionResult,
          LoadExistingSuggestionInputMinimal
        >(async () => ({ type: 'none' as const })),
        schedulePipelineSuggestionTask: fromPromise<
          void,
          SchedulePipelineSuggestionTaskInputMinimal
        >(async () => {}),
        getPipelineSuggestionStatus: fromPromise<
          PipelineSuggestionTaskStatusResult,
          GetPipelineSuggestionStatusInputMinimal
        >(async () => getPipelineSuggestionStatusMock()),
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

  it('stores error in context when task fails with TaskStatus.Failed', async () => {
    jest.useFakeTimers();

    const getPipelineSuggestionStatusMock = jest.fn(
      async (): Promise<PipelineSuggestionTaskStatusResult> => ({
        status: TaskStatus.Failed,
        error: 'LLM connection failed',
      })
    );

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise<
          LoadExistingSuggestionResult,
          LoadExistingSuggestionInputMinimal
        >(async () => ({ type: 'none' as const })),
        schedulePipelineSuggestionTask: fromPromise<
          void,
          SchedulePipelineSuggestionTaskInputMinimal
        >(async () => {}),
        getPipelineSuggestionStatus: fromPromise<
          PipelineSuggestionTaskStatusResult,
          GetPipelineSuggestionStatusInputMinimal
        >(async () => getPipelineSuggestionStatusMock()),
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

    // Wait for the task to be checked and transition to failed state
    await waitForMatch(actor, 'pipelineSuggestion.suggestionFailed');

    // Error should be stored in context for display in the UI
    expect(actor.getSnapshot().context.suggestionError).toBe('LLM connection failed');

    actor.stop();
  });

  it('stores error in context when polling API call fails', async () => {
    jest.useFakeTimers();

    const pollingError = new Error('Network error');
    const getPipelineSuggestionStatusMock = jest.fn(async () => {
      throw pollingError;
    });

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise<
          LoadExistingSuggestionResult,
          LoadExistingSuggestionInputMinimal
        >(async () => ({ type: 'none' as const })),
        schedulePipelineSuggestionTask: fromPromise<
          void,
          SchedulePipelineSuggestionTaskInputMinimal
        >(async () => {}),
        getPipelineSuggestionStatus: fromPromise<
          PipelineSuggestionTaskStatusResult,
          GetPipelineSuggestionStatusInputMinimal
        >(async () => getPipelineSuggestionStatusMock()),
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

    // Wait for the polling to fail and transition to failed state
    await waitForMatch(actor, 'pipelineSuggestion.suggestionFailed');

    // Error should be stored in context for display in the UI
    expect(actor.getSnapshot().context.suggestionError).toBe('Network error');

    actor.stop();
  });

  it('goes to idle state when task is BeingCanceled (no loading screen)', async () => {
    jest.useFakeTimers();

    // First return InProgress, then BeingCanceled to simulate user canceling
    let statusCallCount = 0;
    const getPipelineSuggestionStatusMock = jest.fn(async () => {
      statusCallCount += 1;
      if (statusCallCount === 1) {
        return { status: TaskStatus.InProgress } as PipelineSuggestionTaskStatusResult;
      }
      // After first poll, task is being canceled
      return { status: TaskStatus.BeingCanceled } as PipelineSuggestionTaskStatusResult;
    });

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise<
          LoadExistingSuggestionResult,
          LoadExistingSuggestionInputMinimal
        >(async () => ({ type: 'none' as const })),
        schedulePipelineSuggestionTask: fromPromise<
          void,
          SchedulePipelineSuggestionTaskInputMinimal
        >(async () => {}),
        getPipelineSuggestionStatus: fromPromise<
          PipelineSuggestionTaskStatusResult,
          GetPipelineSuggestionStatusInputMinimal
        >(async () => getPipelineSuggestionStatusMock()),
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

    // First poll returns InProgress, so we wait
    await waitForMatch(actor, 'pipelineSuggestion.waitingForCompletion');
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(1);

    // Advance timer to trigger second poll
    await jest.advanceTimersByTimeAsync(2000);
    await settleActor();
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(2);

    // When BeingCanceled is detected, machine should go directly to idle (no loading screen)
    await waitForMatch(actor, 'pipelineSuggestion.idle');

    // Verify no more polling happens after going to idle
    await jest.advanceTimersByTimeAsync(10000);
    await settleActor();
    expect(getPipelineSuggestionStatusMock).toHaveBeenCalledTimes(2);

    actor.stop();
  });

  it('goes to idle state when loading existing suggestion returns being_canceled', async () => {
    jest.useFakeTimers();

    // loadExistingSuggestion returns being_canceled (task was canceled before page load)
    const loadExistingSuggestionMock = jest.fn(async () => ({
      type: 'being_canceled' as const,
    }));

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise<
          LoadExistingSuggestionResult,
          LoadExistingSuggestionInputMinimal
        >(async () => loadExistingSuggestionMock()),
        schedulePipelineSuggestionTask: fromPromise<
          void,
          SchedulePipelineSuggestionTaskInputMinimal
        >(async () => {}),
        getPipelineSuggestionStatus: fromPromise<
          PipelineSuggestionTaskStatusResult,
          GetPipelineSuggestionStatusInputMinimal
        >(async () => ({ status: TaskStatus.InProgress } as PipelineSuggestionTaskStatusResult)),
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

    // Machine should start in loadingExistingSuggestion, then go to idle when being_canceled
    // (not waitingForCompletion, which would show loading screen)
    await waitForMatch(actor, 'pipelineSuggestion.idle');

    expect(loadExistingSuggestionMock).toHaveBeenCalledTimes(1);

    actor.stop();
  });

  it('stores error in context when loading existing suggestion returns failed', async () => {
    jest.useFakeTimers();

    // loadExistingSuggestion returns failed (task had failed before page load)
    const loadExistingSuggestionMock = jest.fn(async () => ({
      type: 'failed' as const,
      error: 'LLM connection failed during background processing',
    }));

    const testMachine = interactiveModeMachine.provide({
      actors: {
        loadExistingSuggestion: fromPromise<
          LoadExistingSuggestionResult,
          LoadExistingSuggestionInputMinimal
        >(async () => loadExistingSuggestionMock()),
        schedulePipelineSuggestionTask: fromPromise<
          void,
          SchedulePipelineSuggestionTaskInputMinimal
        >(async () => {}),
        getPipelineSuggestionStatus: fromPromise<
          PipelineSuggestionTaskStatusResult,
          GetPipelineSuggestionStatusInputMinimal
        >(async () => ({ status: TaskStatus.InProgress } as PipelineSuggestionTaskStatusResult)),
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

    // Machine should start in loadingExistingSuggestion, then go to suggestionFailed when failed
    await waitForMatch(actor, 'pipelineSuggestion.suggestionFailed');

    expect(loadExistingSuggestionMock).toHaveBeenCalledTimes(1);

    // Error should be stored in context for display in the UI
    expect(actor.getSnapshot().context.suggestionError).toBe(
      'LLM connection failed during background processing'
    );

    actor.stop();
  });
});
