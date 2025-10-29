/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of } from 'rxjs';
import type { InferenceMessage } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import { collapseInternalToolCalls } from './convert_messages_for_inference';
import type { Message } from './types';
import { MessageRole } from './types';
import { addAnonymizationData } from '../server/service/client/operators/add_anonymization_data';
import type { MessageAddEvent } from './conversation_complete';
import { StreamingChatResponseEventType } from './conversation_complete';

jest.mock('@kbn/inference-plugin/common/utils/generate_fake_tool_call_id', () => ({
  generateFakeToolCallId: jest.fn().mockReturnValue('123456'),
}));

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
} as any as Logger;

let timestampCounter = 0;
function getNextTimestamp() {
  timestampCounter++;
  return new Date(timestampCounter * 1000).toISOString();
}

function userMessage(msg: string) {
  return {
    '@timestamp': getNextTimestamp(),
    message: {
      role: MessageRole.User,
      content: msg,
    },
  };
}

function assistantMessage(msg: string) {
  return {
    '@timestamp': getNextTimestamp(),
    message: {
      content: msg,
      role: MessageRole.Assistant,
    },
  };
}

function getTool(
  toolName: 'get_dataset_info' | 'query' | 'execute_query' | 'visualize_query'
): Message[] {
  return [
    {
      '@timestamp': getNextTimestamp(),
      message: {
        content: '',
        function_call: {
          name: toolName,
          arguments: JSON.stringify({}),
          trigger: MessageRole.Assistant,
        },
        role: MessageRole.Assistant,
      },
    },
    {
      '@timestamp': getNextTimestamp(),
      message: {
        content: JSON.stringify({ response: `${toolName} response` }),
        name: toolName,
        role: MessageRole.User,
      },
    },
  ];
}

function hasToolMessage(toolName: string) {
  return (msg: Message) =>
    msg.message.name === toolName || msg.message.function_call?.name === toolName;
}

function formatMessage(msg: Message) {
  const toolName = msg.message.function_call?.name
    ? `${msg.message.function_call.name} (request)`
    : msg.message.name
    ? `${msg.message.name} (response)`
    : undefined;

  return toolName
    ? { role: msg.message.role, toolName }
    : { role: msg.message.role, message: msg.message.content };
}

function deanonymization(value: string) {
  return [
    {
      start: 0,
      end: value.length,
      entity: { value, class_name: value.includes('@') ? 'EMAIL' : 'URL', mask: '[redacted]' },
    },
  ];
}

describe('collapseInternalToolCalls', () => {
  const availableToolNames = ['get_dataset_info', 'query'];

  beforeEach(() => {
    jest.clearAllMocks();
    timestampCounter = 0;
  });

  it('should not collapse messages if there are no tool calls', () => {
    const messages: Message[] = [userMessage('hello'), assistantMessage('hi there')];
    const collapsedMessages = collapseInternalToolCalls({
      messages,
      availableToolNames,
      logger: mockLogger,
    });
    expect(collapsedMessages).toEqual(messages);
  });

  it('should not collapse a "query" tool call', () => {
    const messages: Message[] = [userMessage('hello'), ...getTool('query')];
    const collapsedMessages = collapseInternalToolCalls({
      messages,
      availableToolNames,
      logger: mockLogger,
    });
    expect(collapsedMessages).toEqual(messages);
  });

  it('should collapse "execute_query" when it follows a user message', () => {
    const messages = [
      userMessage('Please generate esql'),
      ...getTool('query'),
      assistantMessage(`Here you go!`),
      userMessage('Display results for the generated ESQL query'),
      ...getTool('execute_query'),
    ];

    // before collapsing
    expect(messages.map(formatMessage)).toEqual([
      { role: 'user', message: 'Please generate esql' },
      { role: 'assistant', toolName: 'query (request)' },
      { role: 'user', toolName: 'query (response)' },
      { role: 'assistant', message: 'Here you go!' },
      { role: 'user', message: 'Display results for the generated ESQL query' },
      { role: 'assistant', toolName: 'execute_query (request)' },
      { role: 'user', toolName: 'execute_query (response)' },
    ]);

    // after collapsing
    const collapsedMessages = collapseInternalToolCalls({
      messages,
      availableToolNames,
      logger: mockLogger,
    });
    expect(collapsedMessages.map(formatMessage)).toEqual([
      { role: 'user', message: 'Please generate esql' },
      { role: 'assistant', toolName: 'query (request)' },
      { role: 'user', toolName: 'query (response)' },
      { role: 'assistant', message: 'Here you go!' },
      {
        role: 'user',
        message: `Display results for the generated ESQL query <steps>${JSON.stringify([
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              { function: { name: 'execute_query', arguments: {} }, toolCallId: '123456' },
            ],
          },
          {
            name: 'execute_query',
            role: 'tool',
            response: { response: 'execute_query response' },
            toolCallId: '123456',
          },
        ])}</steps>`,
      },
    ]);
  });

  describe('when "execute_query" follows a "query" tool call', () => {
    let collapsedMessages: Message[];
    let messages: Message[];
    beforeEach(() => {
      messages = [
        userMessage('Please analyze my logs'),
        ...getTool('get_dataset_info'),
        ...getTool('query'),
        ...getTool('execute_query'),
        assistantMessage('Here is the result'),
        userMessage('What about the unique IPs?'),
      ];
      collapsedMessages = collapseInternalToolCalls({
        messages,
        availableToolNames,
        logger: mockLogger,
      });
    });

    it('should remove the "execute_query" calls', () => {
      // before collapsing
      expect(messages.map(formatMessage)).toEqual([
        { role: 'user', message: 'Please analyze my logs' },
        { role: 'assistant', toolName: 'get_dataset_info (request)' },
        { role: 'user', toolName: 'get_dataset_info (response)' },
        { role: 'assistant', toolName: 'query (request)' },
        { role: 'user', toolName: 'query (response)' },
        { role: 'assistant', toolName: 'execute_query (request)' },
        { role: 'user', toolName: 'execute_query (response)' },
        { role: 'assistant', message: 'Here is the result' },
        { role: 'user', message: 'What about the unique IPs?' },
      ]);

      // after collapsing
      expect(collapsedMessages.map(formatMessage)).toEqual([
        { role: 'user', message: 'Please analyze my logs' },
        { role: 'assistant', toolName: 'get_dataset_info (request)' },
        { role: 'user', toolName: 'get_dataset_info (response)' },
        { role: 'assistant', toolName: 'query (request)' },
        { role: 'user', toolName: 'query (response)' },
        { role: 'assistant', message: 'Here is the result' },
        { role: 'user', message: 'What about the unique IPs?' },
      ]);
    });

    it('should retain the messages up until the execute_query', () => {
      const beforeToolStart =
        messages.findIndex((msg) => msg.message.function_call?.name === 'execute_query') - 1;

      expect(messages.slice(0, beforeToolStart)).toEqual(
        collapsedMessages.slice(0, beforeToolStart)
      );
    });

    it('should retain the messages after the "execute_query" response', () => {
      const toolStartIndex = messages.findIndex(
        (msg) => msg.message.function_call?.name === 'execute_query'
      );

      expect(messages.slice(toolStartIndex + 2)).toEqual(collapsedMessages.slice(toolStartIndex));
    });

    it('should remove the "execute_query" messages', () => {
      expect(messages.some(hasToolMessage('execute_query'))).toBe(true);
      expect(collapsedMessages.some(hasToolMessage('execute_query'))).toBe(false);
    });

    it('should collapse the "execute_query" calls into the "query" tool response', () => {
      const queryToolResponse = collapsedMessages.find(
        (msg) => msg.message.role === MessageRole.User && msg.message.name === 'query'
      )!;

      const content = JSON.parse(queryToolResponse.message.content!);

      expect(content.steps).toHaveLength(2);
      expect(content.steps).toEqual([
        {
          content: '',
          role: 'assistant',
          toolCalls: [
            {
              function: { arguments: {}, name: 'execute_query' },
              toolCallId: expect.any(String),
            },
          ],
        },
        {
          name: 'execute_query',
          response: {
            response: 'execute_query response',
          },
          role: 'tool',
          toolCallId: expect.any(String),
        },
      ]);
    });
  });

  describe('when a query message is followed by "visualize_query" tool pair', () => {
    let collapsedMessages: Message[];
    let messages: Message[];
    beforeEach(() => {
      messages = [
        userMessage('Please visualize my logs'),
        ...getTool('get_dataset_info'),
        ...getTool('query'),
        ...getTool('visualize_query'),
        assistantMessage('Here is the result'),
        userMessage('What about the unique IPs?'),
      ];

      collapsedMessages = collapseInternalToolCalls({
        messages,
        availableToolNames,
        logger: mockLogger,
      });
    });

    it('should collapse "visualize_query" into the "query" response', () => {
      const queryToolResponse = collapsedMessages.find(
        (msg) => msg.message.role === MessageRole.User && msg.message.name === 'query'
      )!;

      const steps = JSON.parse(queryToolResponse.message.content!).steps as [
        InferenceMessage,
        InferenceMessage
      ];

      const [toolCallRequest, toolCallResponse] = steps;

      expect(steps).toHaveLength(2);

      // @ts-expect-error
      expect(toolCallRequest.toolCalls[0].function.name).toContain('visualize_query');
      expect(toolCallRequest.role).toContain('assistant');

      // @ts-expect-error
      expect(toolCallResponse.name).toContain('visualize_query');
      expect(toolCallResponse.role).toContain('tool');
    });
  });

  describe('when an unavailable tool call (execute_query) is followed by an available tool call (get_dataset_info)', () => {
    let collapsedMessages: Message[];
    const messages: Message[] = [
      userMessage('Please find my logs'),
      ...getTool('query'),
      ...getTool('execute_query'),
      ...getTool('get_dataset_info'),
    ];

    beforeEach(() => {
      collapsedMessages = collapseInternalToolCalls({
        messages,
        availableToolNames,
        logger: mockLogger,
      });
    });

    it('should only collapse the "execute_query" tool call', () => {
      expect(messages).toHaveLength(7);
      expect(collapsedMessages).toHaveLength(5);
    });

    it('should add "execute_query" to the "query" response', () => {
      const queryToolResponse = collapsedMessages.find(
        (msg) => msg.message.role === MessageRole.User && msg.message.name === 'query'
      )!;
      expect(queryToolResponse.message.content).toContain('execute_query');
      expect(queryToolResponse.message.content).not.toContain('get_dataset_info');
    });
  });

  describe('when "execute_query" is available tool and "get_dataset_info" is not', () => {
    it('should retain "execute_query" call and remove "get_dataset_info"', () => {
      const messages: Message[] = [
        userMessage('Please generate esql from natural language'),
        ...getTool('get_dataset_info'),
        ...getTool('query'),
        ...getTool('execute_query'),
        assistantMessage('Here is the result'),
        userMessage('What about the unique IPs?'),
      ];

      const collapsedMessages = collapseInternalToolCalls({
        messages,
        availableToolNames: ['execute_query'],
        logger: mockLogger,
      });
      // before collapsing
      expect(messages.map(formatMessage)).toEqual([
        { role: 'user', message: 'Please generate esql from natural language' },
        { role: 'assistant', toolName: 'get_dataset_info (request)' },
        { role: 'user', toolName: 'get_dataset_info (response)' },
        { role: 'assistant', toolName: 'query (request)' },
        { role: 'user', toolName: 'query (response)' },
        { role: 'assistant', toolName: 'execute_query (request)' },
        { role: 'user', toolName: 'execute_query (response)' },
        { role: 'assistant', message: 'Here is the result' },
        { role: 'user', message: 'What about the unique IPs?' },
      ]);

      // after collapsing
      expect(collapsedMessages.map(formatMessage)).toEqual([
        {
          role: 'user',
          message: `Please generate esql from natural language <steps>${JSON.stringify([
            {
              role: 'assistant',
              content: '',
              toolCalls: [
                { function: { name: 'get_dataset_info', arguments: {} }, toolCallId: '123456' },
              ],
            },
            {
              name: 'get_dataset_info',
              role: 'tool',
              response: { response: 'get_dataset_info response' },
              toolCallId: '123456',
            },
            {
              role: 'assistant',
              content: '',
              toolCalls: [{ function: { name: 'query', arguments: {} }, toolCallId: '123456' }],
            },
            {
              name: 'query',
              role: 'tool',
              response: { response: 'query response' },
              toolCallId: '123456',
            },
          ])}</steps>`,
        },
        { role: 'assistant', toolName: 'execute_query (request)' },
        { role: 'user', toolName: 'execute_query (response)' },
        { role: 'assistant', message: 'Here is the result' },
        { role: 'user', message: 'What about the unique IPs?' },
      ]);
    });
  });

  it('should warn and leave messages unchanged when tool result JSON parse fails during collapse', () => {
    const malformedToolResult = getTool('query');
    malformedToolResult[1].message.content = '{ "response": "ok", '; // invalid JSON

    const messages: Message[] = [...malformedToolResult, ...getTool('execute_query')];

    const collapsedMessages = collapseInternalToolCalls({
      messages,
      availableToolNames: ['query'],
      logger: mockLogger,
    });

    expect(collapsedMessages).toEqual(messages);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('convertMessagesForInference', () => {});

describe('anonymization data mapping with collapsed messages', () => {
  let baseUserMessages: Message[];
  const availableToolNames = ['get_dataset_info', 'query'];

  beforeEach(() => {
    baseUserMessages = [
      userMessage('My name is Claudia and my email is claudia@example.com'),
      userMessage('My website is http://claudia.is'),
    ];
  });

  it('maps deanonymizations when the user messagecontent is unchanged (no collapsed messages)', async () => {
    const collapsed = collapseInternalToolCalls({
      messages: baseUserMessages,
      availableToolNames,
      logger: mockLogger,
    });

    const event: MessageAddEvent = {
      type: StreamingChatResponseEventType.MessageAdd,
      id: '1',
      message: collapsed[0],
      deanonymized_input: [
        {
          message: collapsed[0].message,
          deanonymizations: deanonymization('claudia@example.com'),
        },
        {
          message: collapsed[1].message,
          deanonymizations: deanonymization('http://claudia.is'),
        },
      ],
    };

    const result = await lastValueFrom(of(event).pipe(addAnonymizationData(baseUserMessages)));

    expect(result[0].message.deanonymizations).toHaveLength(1);
    expect(result[0].message.deanonymizations?.[0].entity.value).toBe('claudia@example.com');

    expect(result[1].message.deanonymizations).toHaveLength(1);
    expect(result[1].message.deanonymizations?.[0].entity.value).toBe('http://claudia.is');
  });

  it('maps deanonymizations when messages are collapsed', async () => {
    const messagesWithInternalTool: Message[] = [
      ...baseUserMessages,
      ...getTool('visualize_query'),
    ];

    const collapsed = collapseInternalToolCalls({
      messages: messagesWithInternalTool,
      availableToolNames,
      logger: mockLogger,
    });

    const mutatedSecondUserMessage = collapsed.find(
      (m) => m.message.role === MessageRole.User && m.message.content?.startsWith('My website')
    )!.message.content!;

    // Event with deanonymized_input referencing the mutated content
    const event: MessageAddEvent = {
      type: StreamingChatResponseEventType.MessageAdd,
      id: '2',
      message: baseUserMessages[0],
      deanonymized_input: [
        {
          message: baseUserMessages[0].message,
          deanonymizations: deanonymization('claudia@example.com'),
        },
        {
          message: { ...baseUserMessages[1].message, content: mutatedSecondUserMessage },
          deanonymizations: deanonymization('http://claudia.is'),
        },
      ],
    };

    const result = await lastValueFrom(of(event).pipe(addAnonymizationData(baseUserMessages)));

    expect(result[0].message.deanonymizations).toHaveLength(1);
    expect(result[0].message.deanonymizations?.[0].entity.value).toBe('claudia@example.com');

    expect(result[1].message.deanonymizations).toHaveLength(1);
    expect(result[1].message.deanonymizations?.[0].entity.value).toBe('http://claudia.is');
  });
});
