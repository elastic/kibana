/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { AgentActionType } from './actions';
import { createAgentGraph } from './graph';
import type { PromptFactory } from './prompts';
import type { ProcessedConversation } from './utils/prepare_conversation';

jest.mock('@langchain/langgraph/prebuilt', () => ({
  ToolNode: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue([]),
  })),
}));

const createTestGraph = ({ structuredOutput = false }: { structuredOutput?: boolean } = {}) => {
  const researchInvoke = jest.fn();
  const structuredInvoke = jest.fn();
  const chatModel = {
    bindTools: jest.fn(() => ({
      withConfig: jest.fn(() => ({ invoke: researchInvoke })),
    })),
    withStructuredOutput: jest.fn(() => ({
      withConfig: jest.fn(() => ({ invoke: structuredInvoke })),
    })),
  } as unknown as InferenceChatModel;
  const toolManager = {
    list: jest.fn(() => []),
    recordToolUse: jest.fn(),
  } as unknown as ToolManager;
  const promptFactory = {
    getMainPrompt: jest.fn().mockResolvedValue([]),
    getStructuredAnswerPrompt: jest.fn().mockResolvedValue([]),
  } as jest.Mocked<PromptFactory>;

  const graph = createAgentGraph({
    chatModel,
    toolManager,
    configuration: { instructions: '' },
    capabilities: { visualizations: false },
    logger: {} as Logger,
    events: { emit: jest.fn() } as unknown as AgentEventEmitter,
    structuredOutput,
    processedConversation: {} as ProcessedConversation,
    promptFactory,
    roundId: 'test-round',
  });

  return { graph, researchInvoke, structuredInvoke, toolManager };
};

describe('createAgentGraph', () => {
  it('stops after two retries and surfaces emptyResponse for empty research responses', async () => {
    const { graph, researchInvoke } = createTestGraph();
    researchInvoke.mockResolvedValue(new AIMessage({ content: '' }));

    await expect(graph.invoke({ cycleLimit: 10 }, { recursionLimit: 20 })).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.emptyResponse },
    });
    expect(researchInvoke).toHaveBeenCalledTimes(3);
  });

  it('resets the consecutive error counter after a valid research response', async () => {
    const { graph, researchInvoke } = createTestGraph();
    researchInvoke
      .mockResolvedValueOnce(new AIMessage({ content: '' }))
      .mockResolvedValueOnce(new AIMessage({ content: 'final answer' }));

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(result.errorCount).toBe(0);
    expect(result.finalAnswer).toBe('final answer');
    expect(result.mainActions.map(({ type }) => type)).toEqual([
      AgentActionType.Error,
      AgentActionType.HandOver,
    ]);
  });

  it('preserves valid tool-call and handover behavior', async () => {
    const { graph, researchInvoke, toolManager } = createTestGraph();
    researchInvoke
      .mockResolvedValueOnce(
        new AIMessage({
          content: '',
          tool_calls: [{ id: 'call-1', name: 'test-tool', args: {}, type: 'tool_call' }],
        })
      )
      .mockResolvedValueOnce(new AIMessage({ content: 'answer after tool call' }));

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(toolManager.recordToolUse).toHaveBeenCalledWith('test-tool');
    expect(result.finalAnswer).toBe('answer after tool call');
    expect(result.errorCount).toBe(0);
  });

  it('stops after two retries and surfaces emptyResponse for empty structured answers', async () => {
    const { graph, researchInvoke, structuredInvoke } = createTestGraph({
      structuredOutput: true,
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'research complete' }));
    structuredInvoke.mockResolvedValue({});

    await expect(graph.invoke({ cycleLimit: 10 }, { recursionLimit: 20 })).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.emptyResponse },
    });
    expect(researchInvoke).toHaveBeenCalledTimes(1);
    expect(structuredInvoke).toHaveBeenCalledTimes(3);
  });

  it('resets the consecutive error counter after a valid structured answer', async () => {
    const { graph, researchInvoke, structuredInvoke } = createTestGraph({
      structuredOutput: true,
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'research complete' }));
    structuredInvoke
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ response: 'structured answer' });

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(result.errorCount).toBe(0);
    expect(result.finalAnswer).toEqual({ response: 'structured answer' });
    expect(result.answerActions.map(({ type }) => type)).toEqual([
      AgentActionType.Error,
      AgentActionType.StructuredAnswer,
    ]);
  });
});
