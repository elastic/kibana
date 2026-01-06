/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Command,
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { typedInterrupt } from './interrupt';
import type { SelectOptionInterruptResumeValue } from '../schemas';

describe('typedInterrupt', () => {
  beforeAll(() => {
    // @ts-ignore
    delete global.window;
  });

  it('interrupt updates state', async () => {
    const checkpointer = new MemorySaver();
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode('agent', async () => {
        await typedInterrupt({
          type: 'INPUT_TEXT',
          threadId: 'threadId',
          description: 'description',
        });
      })
      .addEdge(START, 'agent')
      .addEdge('agent', END)
      .compile({
        checkpointer,
      });

    await workflow.invoke({}, { configurable: { thread_id: '1' } });

    const state = await workflow.getState({
      configurable: { thread_id: '1' },
    });

    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].interrupts).toHaveLength(1);
    expect(state.tasks[0].interrupts[0]).toEqual(
      expect.objectContaining({
        value: {
          description: 'description',
          threadId: 'threadId',
          type: 'INPUT_TEXT',
        },
      })
    );
  });

  it('interrupt can be resumed', async () => {
    const checkpointer = new MemorySaver();
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode('agent', async () => {
        await typedInterrupt({
          type: 'SELECT_OPTION',
          threadId: 'threadId',
          description: 'description',
          options: [
            {
              label: 'option 1',
              value: 'option_1',
            },
            {
              label: 'option 2',
              value: 'option_2',
            },
          ],
        });
      })
      .addEdge(START, 'agent')
      .addEdge('agent', END)
      .compile({
        checkpointer,
      });

    await workflow.invoke({}, { configurable: { thread_id: '1' } });

    const state = await workflow.getState({
      configurable: { thread_id: '1' },
    });

    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].interrupts).toHaveLength(1);
    expect(state.tasks[0].interrupts[0]).toEqual(
      expect.objectContaining({
        value: {
          description: 'description',
          threadId: 'threadId',
          type: 'SELECT_OPTION',
          options: [
            {
              label: 'option 1',
              value: 'option_1',
            },
            {
              label: 'option 2',
              value: 'option_2',
            },
          ],
        },
      })
    );

    const resumeValue: SelectOptionInterruptResumeValue = {
      type: 'SELECT_OPTION',
      value: 'option_2',
    };

    await workflow.invoke(new Command({ resume: resumeValue }), {
      configurable: { thread_id: '1' },
    });

    const finalState = await workflow.getState({
      configurable: { thread_id: '1' },
    });

    expect(finalState.tasks).toHaveLength(0);
  });

  it('resume value is validated', async () => {
    const checkpointer = new MemorySaver();
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode('agent', async () => {
        await typedInterrupt({
          type: 'SELECT_OPTION',
          threadId: 'threadId',
          description: 'description',
          options: [
            {
              label: 'option 1',
              value: 'option_1',
            },
            {
              label: 'option 2',
              value: 'option_2',
            },
          ],
        });
      })
      .addEdge(START, 'agent')
      .addEdge('agent', END)
      .compile({
        checkpointer,
      });

    await workflow.invoke({}, { configurable: { thread_id: '1' } });

    const state = await workflow.getState({
      configurable: { thread_id: '1' },
    });

    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].interrupts).toHaveLength(1);
    expect(state.tasks[0].interrupts[0]).toEqual(
      expect.objectContaining({
        value: {
          description: 'description',
          threadId: 'threadId',
          type: 'SELECT_OPTION',
          options: [
            {
              label: 'option 1',
              value: 'option_1',
            },
            {
              label: 'option 2',
              value: 'option_2',
            },
          ],
        },
      })
    );

    const resumeValue = {
      type: 'SELECT_OPTION',
      value: {
        invalidKey: 'invalidValue',
      },
    };

    await expect(
      workflow.invoke(new Command({ resume: resumeValue }), { configurable: { thread_id: '1' } })
    ).rejects.toThrow(/Resume value did not match schema/i);
  });
});
