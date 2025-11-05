/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation, type StateType } from './state';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { advanceState } from './advance_state';
import type { createAgentGraph } from './graph';
import type { BaseMessage } from '@langchain/core/messages';

describe('advanceState', () => {
  const aiMessage1 = new AIMessage('success');
  const aiMessage2 = new AIMessage('success again');
  const aiMessage3 = new AIMessage('success again again');

  const THREAD_ID = '1';
  const DEFAULT_CYCLE_LIMIT = 10;

  const getExampleGraph = (checkpointer: MemorySaver) => {
    const aiMessageQueue = [aiMessage1, aiMessage2, aiMessage3].slice();
    return new StateGraph(StateAnnotation)
      .addNode('success', async (state) => {
        const aiMessage = aiMessageQueue.shift();
        if (!aiMessage) {
          throw new Error('No AI message in queue');
        }
        return {
          addedMessages: [aiMessage],
        };
      })
      .addEdge(START, 'success')
      .addEdge('success', END)
      .compile({
        checkpointer,
      }) as ReturnType<typeof createAgentGraph>;
  };

  // Helper functions
  const setupTest = () => {
    const checkpointer = new MemorySaver();
    const graph = getExampleGraph(checkpointer);
    return { graph, checkpointer };
  };

  const invokeGraph = async (
    graph: ReturnType<typeof createAgentGraph>,
    messages: BaseMessage[],
    threadId: string = THREAD_ID
  ) => {
    await graph.invoke({ initialMessages: messages }, { configurable: { thread_id: threadId } });
  };

  const getStateValues = async (
    graph: ReturnType<typeof createAgentGraph>,
    threadId: string = THREAD_ID
  ) => {
    const state = await graph.getState({ configurable: { thread_id: threadId } });
    return state.values;
  };

  const expectState = async (
    graph: ReturnType<typeof createAgentGraph>,
    expected: Partial<StateType>,
    threadId: string = THREAD_ID
  ) => {
    const actual = await getStateValues(graph, threadId);
    expect(actual).toEqual({
      cycleLimit: DEFAULT_CYCLE_LIMIT,
      currentCycle: 0,
      ...expected,
    });
  };

  it('happy path - advances state correctly through multiple invocations', async () => {
    const { graph } = setupTest();
    const humanMessage1 = new HumanMessage('hello');
    const humanMessage2 = new HumanMessage('hello again');

    // Initial advance (empty state)
    await advanceState(graph, { threadId: THREAD_ID });

    // First invocation: human message -> AI response
    await invokeGraph(graph, [humanMessage1]);
    await expectState(graph, {
      initialMessages: [humanMessage1],
      addedMessages: [aiMessage1],
    });

    // Advance state: merge addedMessages into initialMessages
    await advanceState(graph, { threadId: THREAD_ID });
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1],
      addedMessages: [],
      maxCycleReached: false,
    });

    // Second advance (prepare for next invocation)
    await advanceState(graph, { threadId: THREAD_ID });

    // Second invocation: new human message -> AI response
    await invokeGraph(graph, [humanMessage2]);
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1, humanMessage2],
      addedMessages: [aiMessage2],
      maxCycleReached: false,
    });

    // Final advance: merge AI response into initial messages
    await advanceState(graph, { threadId: THREAD_ID });
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1, humanMessage2, aiMessage2],
      addedMessages: [],
      maxCycleReached: false,
    });
  });

  it('reverts to empty state when called on empty state', async () => {
    const { graph } = setupTest();
    const humanMessage1 = new HumanMessage('hello');

    // Get revert function from empty state
    const revertToCheckpoint = await advanceState(graph, { threadId: THREAD_ID });

    // Invoke graph and advance state
    await invokeGraph(graph, [humanMessage1]);
    await expectState(graph, {
      initialMessages: [humanMessage1],
      addedMessages: [aiMessage1],
    });

    await advanceState(graph, { threadId: THREAD_ID });
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1],
      addedMessages: [],
      maxCycleReached: false,
    });

    // Revert to empty state
    await revertToCheckpoint();
    await expectState(graph, {
      initialMessages: [],
      addedMessages: [],
      maxCycleReached: false,
    });
  });

  it('reverts to previous state after multiple advances', async () => {
    const { graph } = setupTest();
    const humanMessage1 = new HumanMessage('hello');
    const humanMessage2 = new HumanMessage('hello again');
    const humanMessage3 = new HumanMessage('hello again again');

    // Initial setup: first message and advance
    await advanceState(graph, { threadId: THREAD_ID });
    await invokeGraph(graph, [humanMessage1]);
    await expectState(graph, {
      initialMessages: [humanMessage1],
      addedMessages: [aiMessage1],
    });

    await advanceState(graph, { threadId: THREAD_ID });
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1],
      addedMessages: [],
      maxCycleReached: false,
    });

    // Get revert function at this checkpoint
    const revertToCheckpoint1 = await advanceState(graph, { threadId: THREAD_ID });

    // Continue with second message
    await invokeGraph(graph, [humanMessage2]);
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1, humanMessage2],
      addedMessages: [aiMessage2],
      maxCycleReached: false,
    });

    await advanceState(graph, { threadId: THREAD_ID }); // extra advance that should not matter

    // Revert to checkpoint (after first advance)
    await revertToCheckpoint1();
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1],
      addedMessages: [],
      maxCycleReached: false,
    });

    await advanceState(graph, { threadId: THREAD_ID });
    const revertToCheckpoint2 = await advanceState(graph, { threadId: THREAD_ID });

    // Continue from checkpoint with third message
    await invokeGraph(graph, [humanMessage3]);
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1, humanMessage3],
      addedMessages: [aiMessage3],
      maxCycleReached: false,
    });

    // Revert to checkpoint (after second advance)
    await revertToCheckpoint2();
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1],
      addedMessages: [],
      maxCycleReached: false,
    });

    // Final advance
    await advanceState(graph, { threadId: THREAD_ID });
    await expectState(graph, {
      initialMessages: [humanMessage1, aiMessage1],
      addedMessages: [],
      maxCycleReached: false,
    });
  });
});
