/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessage, ToolMessage } from '@langchain/core/messages';
import { isHumanMessage, isAIMessage } from '@langchain/core/messages';
import type { ToolCallWithResult, ToolCallStep } from '@kbn/onechat-common';
import { ConversationRoundStepType } from '@kbn/onechat-common';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import { conversationToLangchainMessages } from './to_langchain_messages';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type {
  ProcessedConversationRound,
  ProcessedAttachment,
  ProcessedRoundInput,
} from './prepare_conversation';

describe('conversationLangchainMessages', () => {
  const makeRoundInput = (
    message: string,
    attachments: ProcessedAttachment[] = []
  ): ProcessedRoundInput => ({
    message,
    attachments,
  });
  const makeAssistantResponse = (message: string) => ({ message });
  const makeToolCallWithResult = (
    id: string,
    toolId: string,
    params: any,
    results: ToolResult[]
  ): ToolCallWithResult => ({
    tool_call_id: id,
    tool_id: toolId,
    params,
    results,
  });
  const makeToolCallStep = (toolCall: ToolCallWithResult): ToolCallStep => ({
    ...toolCall,
    type: ConversationRoundStepType.toolCall,
  });
  const makeProcessedAttachment = (
    id: string,
    type: string,
    data: any,
    representationValue: string
  ): ProcessedAttachment => ({
    attachment: {
      id,
      type,
      data,
    },
    representation: {
      type: 'text',
      value: representationValue,
    },
  });

  it('returns only the user message if no previous rounds', () => {
    const nextInput = makeRoundInput('hello');
    const result = conversationToLangchainMessages({
      conversation: { previousRounds: [], nextInput },
    });
    expect(result).toHaveLength(1);
    expect(isHumanMessage(result[0])).toBe(true);
    expect(result[0].content).toBe('hello');
  });

  it('handles a round with only user and assistant messages', () => {
    const previousRounds: ProcessedConversationRound[] = [
      {
        id: 'round-1',
        input: makeRoundInput('hi'),
        steps: [],
        response: makeAssistantResponse('hello!'),
      },
    ];
    const nextInput = makeRoundInput('how are you?');
    const result = conversationToLangchainMessages({
      conversation: { previousRounds, nextInput },
    });

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
    const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
      {
        tool_result_id: 'result-1',
        type: ToolResultType.other,
        data: {
          some: 'result1',
        },
      },
    ]);
    const previousRounds: ProcessedConversationRound[] = [
      {
        id: 'round-1',
        input: makeRoundInput('find foo'),
        steps: [makeToolCallStep(toolCall)],
        response: makeAssistantResponse('done!'),
      },
    ];
    const nextInput = makeRoundInput('next');
    const result = conversationToLangchainMessages({
      conversation: { previousRounds, nextInput },
    });
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
    expect(toolCallToolMessage.content).toEqual(
      JSON.stringify({
        results: [
          {
            tool_result_id: 'result-1',
            type: ToolResultType.other,
            data: {
              some: 'result1',
            },
          },
        ],
      })
    );
    expect(isAIMessage(assistantMessage)).toBe(true);
    expect(assistantMessage.content).toBe('done!');
    expect(isHumanMessage(nextHumanMessage)).toBe(true);
    expect(nextHumanMessage.content).toBe('next');
  });

  it('handles multiple rounds', () => {
    const previousRounds: ProcessedConversationRound[] = [
      {
        id: 'round-1',
        input: makeRoundInput('hi'),
        steps: [],
        response: makeAssistantResponse('hello!'),
      },
      {
        id: 'round-2',
        input: makeRoundInput('search for bar'),
        steps: [
          makeToolCallStep(
            makeToolCallWithResult('call-2', 'lookup', { id: 42 }, [
              { tool_result_id: 'result-2', type: ToolResultType.other, data: { some: 'result1' } },
            ])
          ),
        ],
        response: makeAssistantResponse('done with bar'),
      },
    ];
    const nextInput = makeRoundInput('bye');
    const result = conversationToLangchainMessages({
      conversation: { previousRounds, nextInput },
    });
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
    expect(toolCallToolMessage.content).toEqual(
      JSON.stringify({
        results: [
          { tool_result_id: 'result-2', type: ToolResultType.other, data: { some: 'result1' } },
        ],
      })
    );
    expect(isAIMessage(secondAssistantMessage)).toBe(true);
    expect(secondAssistantMessage.content).toBe('done with bar');
    expect(isHumanMessage(lastHumanMessage)).toBe(true);
    expect(lastHumanMessage.content).toBe('bye');
  });

  it('escapes tool ids', () => {
    const toolCall = makeToolCallWithResult('call-1', '.search', { query: 'foo' }, [
      {
        tool_result_id: 'result-1',
        type: ToolResultType.other,
        data: {
          some: 'data',
        },
      },
    ]);
    const previousRounds: ProcessedConversationRound[] = [
      {
        id: 'round-1',
        input: makeRoundInput('find foo'),
        steps: [makeToolCallStep(toolCall)],
        response: makeAssistantResponse('done!'),
      },
    ];
    const nextInput = makeRoundInput('next');
    const result = conversationToLangchainMessages({
      conversation: { previousRounds, nextInput },
    });
    // 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
    expect(result).toHaveLength(5);
    const [_human, toolCallAIMessage] = result;

    expect(isAIMessage(toolCallAIMessage)).toBe(true);
    expect((toolCallAIMessage as AIMessage).tool_calls).toHaveLength(1);
    expect((toolCallAIMessage as AIMessage).tool_calls![0].name).toBe(sanitizeToolId('.search'));
  });

  describe('with attachments', () => {
    it('includes a single attachment in the user message', () => {
      const attachment = makeProcessedAttachment(
        'att-1',
        'text',
        { content: 'test content' },
        'This is the formatted text content'
      );
      const nextInput = makeRoundInput('hello with attachment', [attachment]);
      const result = conversationToLangchainMessages({
        conversation: { previousRounds: [], nextInput },
      });

      expect(result).toHaveLength(1);
      expect(isHumanMessage(result[0])).toBe(true);
      expect(result[0].content).toContain('hello with attachment');
      expect(result[0].content).toContain('<attachments>');
      expect(result[0].content).toContain('<attachment type="text" id="att-1">');
      expect(result[0].content).toContain('This is the formatted text content');
      expect(result[0].content).toContain('</attachment>');
      expect(result[0].content).toContain('</attachments>');
    });

    it('includes multiple attachments in the user message', () => {
      const attachment1 = makeProcessedAttachment(
        'att-1',
        'text',
        { content: 'first' },
        'First attachment content'
      );
      const attachment2 = makeProcessedAttachment(
        'att-2',
        'screen_context',
        { url: 'http://example.com' },
        'Screen context data'
      );
      const nextInput = makeRoundInput('message with multiple attachments', [
        attachment1,
        attachment2,
      ]);
      const result = conversationToLangchainMessages({
        conversation: { previousRounds: [], nextInput },
      });

      expect(result).toHaveLength(1);
      expect(isHumanMessage(result[0])).toBe(true);
      const content = result[0].content as string;
      expect(content).toContain('message with multiple attachments');
      expect(content).toContain('<attachments>');
      expect(content).toContain('<attachment type="text" id="att-1">');
      expect(content).toContain('First attachment content');
      expect(content).toContain('<attachment type="screen_context" id="att-2">');
      expect(content).toContain('Screen context data');
      expect(content).toContain('</attachments>');
    });

    it('includes attachments from previous rounds', () => {
      const attachment = makeProcessedAttachment(
        'prev-att-1',
        'text',
        { content: 'previous' },
        'Previous round attachment'
      );
      const previousRounds: ProcessedConversationRound[] = [
        {
          id: 'round-1',
          input: makeRoundInput('message with attachment', [attachment]),
          steps: [],
          response: makeAssistantResponse('got it'),
        },
      ];
      const nextInput = makeRoundInput('next message');
      const result = conversationToLangchainMessages({
        conversation: { previousRounds, nextInput },
      });

      expect(result).toHaveLength(3);
      const [firstHumanMessage, assistantMessage, secondHumanMessage] = result;

      expect(isHumanMessage(firstHumanMessage)).toBe(true);
      const firstContent = firstHumanMessage.content as string;
      expect(firstContent).toContain('message with attachment');
      expect(firstContent).toContain('<attachments>');
      expect(firstContent).toContain('<attachment type="text" id="prev-att-1">');
      expect(firstContent).toContain('Previous round attachment');

      expect(isAIMessage(assistantMessage)).toBe(true);
      expect(assistantMessage.content).toBe('got it');

      expect(isHumanMessage(secondHumanMessage)).toBe(true);
      expect(secondHumanMessage.content).toBe('next message');
      expect(secondHumanMessage.content).not.toContain('<attachments>');
    });
  });
});
