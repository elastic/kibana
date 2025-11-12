/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The next graph state of the next graph execution will be initialized with the current state.
 * Advance the state to prepare for the next graph execution.
 */

import { RemoveMessage } from '@langchain/core/messages';
import { REMOVE_ALL_MESSAGES } from '@langchain/langgraph';
import isEmpty from 'lodash/isEmpty';
import { DEFAULT_CYCLE_LIMIT, type StateType } from './state';
import type { createAgentGraph } from './graph';

interface AdvanceStateOptions {
  threadId: string;
}

/**
 * Advance the state of the graph in preparation for the next graph invocation.
 * Graph state is persisted throughout the whole conversation. The checkpointer
 * persists the final state of each graph invocation and uses the persisted state
 * to initialize the next graph invocation. We need to clean up the old state.
 *
 * @returns A function that can be used to revert to state before this function was called.
 */
export const advanceState = async (
  compiledGraph: ReturnType<typeof createAgentGraph>,
  options: AdvanceStateOptions
) => {
  const oldState = await compiledGraph.getState({
    configurable: {
      thread_id: options.threadId,
    },
  });

  if (isEmpty(oldState.values)) {
    // no state to advance
    return async () => {
      // Return a callback that resets the checkpointer to a clean state.
      const revertState = {
        initialMessages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES })],
        cycleLimit: DEFAULT_CYCLE_LIMIT,
        currentCycle: 0,
        nextMessage: undefined,
        maxCycleReached: false,
        handoverNote: undefined,
        addedMessages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES })],
      } satisfies Partial<StateType>;

      await compiledGraph.updateState(
        {
          configurable: {
            thread_id: options.threadId,
          },
        },
        revertState
      );
    };
  }

  const oldValues = oldState.values;

  // append the added messages to the initial messages to form the initial messages for the next graph invocation.
  const initialMessages = oldValues.initialMessages;
  const addedMessages = oldValues.addedMessages;
  const newInitialMessages = [...initialMessages, ...addedMessages];

  const newValues = {
    ...oldValues,
    initialMessages: newInitialMessages,
    currentCycle: 0, // reset the cycle count
    nextMessage: undefined, // remove the next message from the state
    handoverNote: undefined, // remove the handover note from the state
    maxCycleReached: false, // reset the cycle limit
    addedMessages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES })], // clear added messages from the state with special remove message.
  } satisfies StateType;

  await compiledGraph.updateState(
    {
      configurable: {
        thread_id: options.threadId,
      },
    },
    newValues
  );

  return async () => {
    // Return a callback that resets the checkpointer to the previous state.
    const revertState = {
      ...oldValues,
      addedMessages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), ...oldValues.addedMessages],
      initialMessages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ...oldValues.initialMessages,
      ],
    } satisfies StateType;

    await compiledGraph.updateState(
      {
        configurable: {
          thread_id: options.threadId,
        },
      },
      revertState
    );
  };
};
