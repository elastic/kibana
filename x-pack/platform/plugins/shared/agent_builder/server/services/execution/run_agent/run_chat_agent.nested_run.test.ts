/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { StreamEvent } from '@langchain/core/tracers/log_stream';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { ChatEventType, ConversationRoundStepType } from '@kbn/agent-builder-common';
import { createAgentHandlerContextMock } from '../../../test_utils/runner';
import { runDefaultAgentMode } from './run_chat_agent';
import { prepareConversation, selectTools } from './utils';
import { steps as nodeNames } from './constants';

// The graph, the event conversion and the round assembly run for real: what a sub-agent run goes
// through when it is started from inside the parent's `executeTool` node.
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  prepareConversation: jest.fn(),
  selectTools: jest.fn(),
  selectSkills: jest.fn().mockResolvedValue([]),
}));

jest.mock('./tools/register_internal_tools', () => ({
  registerInternalTools: jest.fn(),
}));

jest.mock('./utils/create_result_transformer', () => ({
  createResultTransformer: jest.fn(() => ({})),
}));

jest.mock('./utils/image_resolver', () => ({
  createImageResolver: jest.fn(() => jest.fn()),
}));

jest.mock('./prompts', () => ({
  createPromptFactory: jest.fn(() => ({
    getMainPrompt: jest.fn().mockResolvedValue([]),
    getStructuredAnswerPrompt: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('@langchain/langgraph/prebuilt', () => ({
  ToolNode: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue([]),
  })),
}));

const prepareConversationMock = prepareConversation as jest.MockedFn<typeof prepareConversation>;
const selectToolsMock = selectTools as jest.MockedFn<typeof selectTools>;

describe('runDefaultAgentMode started from inside another graph node (sub-agent run)', () => {
  it('completes the round with its tool call, result and answer, and leaks nothing to the parent stream', async () => {
    const context = createAgentHandlerContextMock();
    const researchInvoke = jest
      .fn()
      .mockResolvedValueOnce(
        new AIMessage({
          content: 'looking',
          tool_calls: [{ id: 'c1', name: 'my_tool', args: { q: 1 } }],
        })
      )
      .mockResolvedValueOnce(new AIMessage({ content: 'done' }));
    const chatModel = {
      bindTools: jest.fn(() => ({ withConfig: jest.fn(() => ({ invoke: researchInvoke })) })),
    };
    jest.spyOn(context.modelProvider, 'getDefaultModel').mockResolvedValue({
      connector: { name: 'test-connector', connectorId: 'connector-1' },
      chatModel,
    } as any);
    context.toolManager.list.mockReturnValue([]);
    context.toolManager.getToolIdMapping.mockReturnValue(new Map([['my_tool', 'my.tool']]));
    context.toolManager.getDynamicToolIds.mockReturnValue([]);
    jest.mocked(context.attachmentStateManager.getAccessedRefs).mockReturnValue([]);
    prepareConversationMock.mockResolvedValue({
      timeline: [],
      nextInput: { message: 'hello', attachments: [] },
      attachments: [],
      attachmentTypes: [],
      attachmentStateManager: context.attachmentStateManager,
    } as any);
    selectToolsMock.mockResolvedValue({ staticTools: [], dynamicTools: [] } as any);
    const { ToolNode } = jest.requireMock('@langchain/langgraph/prebuilt');
    ToolNode.mockImplementationOnce(() => ({
      invoke: jest.fn().mockResolvedValue([
        new ToolMessage({
          tool_call_id: 'c1',
          content: 'r1',
          artifact: { results: [{ type: 'other', data: { n: 1 } }] },
        }),
      ]),
    }));

    const parent = new StateGraph(Annotation.Root({ round: Annotation<ConversationRound>() }))
      .addNode('executeTool', async () => {
        const { round } = await runDefaultAgentMode(
          {
            nextInput: { message: 'hello' },
            agentConfiguration: { tools: [] } as any,
            agentId: 'child-agent',
          },
          context
        );
        return { round };
      })
      .addEdge(START, 'executeTool')
      .addEdge('executeTool', END)
      .compile();

    const parentEvents: StreamEvent[] = [];
    let round: ConversationRound | undefined;
    for await (const event of parent.streamEvents(
      {},
      { version: 'v2', runName: 'parent-graph', streamMode: 'values' }
    )) {
      parentEvents.push(event);
      if (event.event === 'on_chain_end' && event.name === 'parent-graph') {
        round = event.data.output.round;
      }
    }

    expect(round?.response.message).toBe('done');
    expect(round?.steps.filter((step) => step.type === ConversationRoundStepType.toolCall)).toEqual(
      [
        expect.objectContaining({
          tool_call_id: 'c1',
          tool_id: 'my.tool',
          params: { q: 1 },
          results: [expect.objectContaining({ type: 'other', data: { n: 1 } })],
        }),
      ]
    );

    const emittedTypes = jest.mocked(context.events.emit).mock.calls.map(([event]) => event.type);
    const countOf = (type: ChatEventType) => emittedTypes.filter((t) => t === type).length;
    expect(countOf(ChatEventType.toolCall)).toBe(1);
    expect(countOf(ChatEventType.toolResult)).toBe(1);
    expect(countOf(ChatEventType.messageComplete)).toBe(1);
    expect(countOf(ChatEventType.roundComplete)).toBe(1);

    // the child's events stay on its own stream (`callbacks: []`): nothing of the chat graph, whose
    // own nodes are root-level once the namespace is reset, reaches the parent's stream
    const leaked = parentEvents.filter(
      (event) =>
        event.metadata?.graphName !== undefined ||
        event.event === 'on_chat_model_stream' ||
        event.name === nodeNames.researchAgent ||
        event.name === nodeNames.finalize
    );
    expect(leaked).toEqual([]);
  });
});
