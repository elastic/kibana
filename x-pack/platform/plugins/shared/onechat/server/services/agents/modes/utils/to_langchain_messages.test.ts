/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHumanMessage, isAIMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import {
  ToolCallWithResult,
  ToolCallStep,
  ConversationRoundStepType,
  ConversationRound,
} from '@kbn/onechat-common';
import { conversationToLangchainMessages } from './to_langchain_messages';

describe('conversationLangchainMessages', () => {
  const makeRoundInput = (message: string) => ({ message });
  const makeAssistantResponse = (message: string) => ({ message });
  const makeToolCallWithResult = (
    id: string,
    toolId: string,
    params: any,
    result: string
  ): ToolCallWithResult => ({
    tool_call_id: id,
    tool_id: toolId,
    tool_type: 'provider-1',
    params,
    result,
  });
  const makeToolCallStep = (toolCall: ToolCallWithResult): ToolCallStep => ({
    ...toolCall,
    type: ConversationRoundStepType.toolCall,
  });

  it('returns only the user message if no previous rounds', () => {
    const nextInput = makeRoundInput('hello');
    const result = conversationToLangchainMessages({ previousRounds: [], nextInput });
    expect(result).toHaveLength(1);
    expect(isHumanMessage(result[0])).toBe(true);
    expect(result[0].content).toBe('hello');
  });

  it('handles a round with only user and assistant messages', () => {
    const previousRounds: ConversationRound[] = [
      {
        input: makeRoundInput('hi'),
        steps: [],
        response: makeAssistantResponse('hello!'),
      },
    ];
    const nextInput = makeRoundInput('how are you?');
    const result = conversationToLangchainMessages({ previousRounds, nextInput });

    expect(result).toHaveLength(3);

    const [firstHumanMessage, firstAssistantMessage, secondHumanMessage] = result;
    expect(isHumanMessage(firstHumanMessage)).toBe(true);
    expect(firstHumanMessage.content).toBe('hi');
    expect(isAIMessage(firstAssistantMessage)).toBe(true);
    expect(firstAssistantMessage.content).toBe('hello!');
    expect(isHumanMessage(secondHumanMessage)).toBe(true);
    expect(secondHumanMessage.content).toBe('how are you?');
  });

  it('handles a round with a tool call step', () => {
    const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, 'result!');
    const previousRounds: ConversationRound[] = [
      {
        input: makeRoundInput('find foo'),
        steps: [makeToolCallStep(toolCall)],
        response: makeAssistantResponse('done!'),
      },
    ];
    const nextInput = makeRoundInput('next');
    const result = conversationToLangchainMessages({ previousRounds, nextInput });
    // 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
    expect(result).toHaveLength(5);
    const [
      firstHumanMessage,
      toolCallAIMessage,
      toolCallToolMessage,
      assistantMessage,
      nextHumanMessage,
    ] = result;
    expect(isHumanMessage(firstHumanMessage)).toBe(true);
    expect(firstHumanMessage.content).toBe('find foo');
    expect(isAIMessage(toolCallAIMessage)).toBe(true);
    expect((toolCallAIMessage as AIMessage).tool_calls).toHaveLength(1);
    expect((toolCallAIMessage as AIMessage).tool_calls![0].id).toBe('call-1');
    // ToolMessage type guard is not imported, so just check property
    expect((toolCallToolMessage as ToolMessage).tool_call_id).toBe('call-1');
    expect((toolCallToolMessage as ToolMessage).content).toBe('result!');
    expect(isAIMessage(assistantMessage)).toBe(true);
    expect(assistantMessage.content).toBe('done!');
    expect(isHumanMessage(nextHumanMessage)).toBe(true);
    expect(nextHumanMessage.content).toBe('next');
  });

  it('handles multiple rounds', () => {
    const previousRounds: ConversationRound[] = [
      {
        input: makeRoundInput('hi'),
        steps: [],
        response: makeAssistantResponse('hello!'),
      },
      {
        input: makeRoundInput('search for bar'),
        steps: [makeToolCallStep(makeToolCallWithResult('call-2', 'lookup', { id: 42 }, 'found!'))],
        response: makeAssistantResponse('done with bar'),
      },
    ];
    const nextInput = makeRoundInput('bye');
    const result = conversationToLangchainMessages({ previousRounds, nextInput });
    // 1 user + 1 assistant + 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
    expect(result).toHaveLength(7);
    const [
      firstHumanMessage,
      firstAssistantMessage,
      secondHumanMessage,
      toolCallAIMessage,
      toolCallToolMessage,
      secondAssistantMessage,
      lastHumanMessage,
    ] = result;
    expect(isHumanMessage(firstHumanMessage)).toBe(true);
    expect(firstHumanMessage.content).toBe('hi');
    expect(isAIMessage(firstAssistantMessage)).toBe(true);
    expect(firstAssistantMessage.content).toBe('hello!');
    expect(isHumanMessage(secondHumanMessage)).toBe(true);
    expect(secondHumanMessage.content).toBe('search for bar');
    expect(isAIMessage(toolCallAIMessage)).toBe(true);
    expect((toolCallAIMessage as AIMessage).tool_calls).toHaveLength(1);
    expect((toolCallAIMessage as AIMessage).tool_calls![0].id).toBe('call-2');
    expect((toolCallToolMessage as ToolMessage).tool_call_id).toBe('call-2');
    expect((toolCallToolMessage as ToolMessage).content).toBe('found!');
    expect(isAIMessage(secondAssistantMessage)).toBe(true);
    expect(secondAssistantMessage.content).toBe('done with bar');
    expect(isHumanMessage(lastHumanMessage)).toBe(true);
    expect(lastHumanMessage.content).toBe('bye');
  });
});
