/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceMessage } from '@elastic/elasticsearch/lib/api/types';
import { collapseInternalToolCalls } from './convert_messages_for_inference';
import { Message, MessageRole } from './types';

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

const userMessage: (msg: string) => Message = (msg: string) => ({
  '@timestamp': '2025-07-02T10:00:00Z',
  message: {
    role: MessageRole.User,
    content: msg,
  },
});

const assistantMessage: (msg: string) => Message = (msg: string) => ({
  '@timestamp': '2025-07-02T10:01:00Z',
  message: {
    content: msg,
    role: MessageRole.Assistant,
  },
});

const getDatasetInfoTool: Message[] = [
  {
    '@timestamp': '2025-07-02T10:01:00Z',
    message: {
      content:
        "I'll help you visualize logs from your system. First, let me check what log indices are available:",
      function_call: {
        name: 'get_dataset_info',
        arguments: '{"index": "logs-*"}',
        trigger: MessageRole.Assistant,
      },
      role: MessageRole.Assistant,
    },
  },
  {
    '@timestamp': '2025-07-02T10:01:00Z',
    message: {
      content: JSON.stringify({
        indices: ['remote_cluster:logs-cloud_security_posture.scores-default'],
        fields: ['@timestamp:date', 'log.level:keyword'],
        stats: {
          analyzed: 386,
          total: 386,
        },
      }),
      name: 'get_dataset_info',
      role: MessageRole.User,
    },
  },
];

const queryTool: Message[] = [
  {
    '@timestamp': '2025-07-04T14:32:53.974Z',
    message: {
      content: 'Now that I can see the available log indices, let me visualize some logs for you:',
      function_call: {
        name: 'query',
        arguments: '',
        trigger: MessageRole.Assistant,
      },
      role: MessageRole.Assistant,
    },
  },
  {
    '@timestamp': '2025-07-04T14:32:57.331Z',
    message: {
      content: '{}',
      data: JSON.stringify({
        keywords: ['STATS', 'COUNT_DISTINCT'],
        requestedDocumentation: {
          STATS: 'Aggregates data using statistical functions.',
          COUNT_DISTINCT: 'Counts distinct values in a field.',
        },
      }),
      name: 'query',
      role: MessageRole.User,
    },
  },
];

const executeQueryTool: Message[] = [
  {
    '@timestamp': '2025-07-02T10:01:00Z',
    message: {
      content: undefined,
      role: MessageRole.Assistant,
      function_call: {
        name: 'execute_query',
        arguments: '{"query":"FROM logs"}',
        trigger: MessageRole.Assistant,
      },
    },
  },
  {
    '@timestamp': '2025-07-02T10:01:01Z',
    message: {
      role: MessageRole.User,
      name: 'execute_query',
      content: JSON.stringify({
        columns: [{ id: 'unique_ips', name: 'unique_ips', meta: { type: 'number' } }],
        rows: [[324567]],
      }),
    },
  },
];

const visualizeQueryTool: Message[] = [
  {
    '@timestamp': '2025-07-04T14:33:03.937Z',
    message: {
      content:
        "Now I'll create a visualization of your logs. Let me query the available logs and create a meaningful visualization:",
      role: MessageRole.Assistant,
      function_call: {
        name: 'visualize_query',
        arguments: '{"query":"FROM remote_cluster:logs-* | LIMIT 10","intention":"visualizeBar"}',
        trigger: MessageRole.Assistant,
      },
    },
  },
  {
    '@timestamp': '2025-07-04T14:33:33.978Z',
    message: {
      content: JSON.stringify({
        errorMessages: ['Request timed out'],
        message:
          'Only following query is visualized: ```esql\nFROM remote_cluster:logs-* | LIMIT 10\n```',
      }),
      data: JSON.stringify({
        columns: [],
        rows: [],
        correctedQuery:
          'FROM remote_cluster:logs-*\n| WHERE @timestamp >= NOW() - 24 hours\n| STATS count = COUNT(*) BY data_stream.dataset, log.level\n| SORT count DESC\n| LIMIT 10',
      }),
      name: 'visualize_query',
      role: MessageRole.User,
    },
  },
];

describe('collapseInternalToolCalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not collapse messages if there are no query messages', () => {
    const messages: Message[] = [
      {
        '@timestamp': '2025-07-02T10:00:00Z',
        message: { role: MessageRole.User, content: 'hello' },
      },
      {
        '@timestamp': '2025-07-02T10:01:00Z',
        message: { role: MessageRole.Assistant, content: 'hi there' },
      },
    ];
    const collapsedMessages = collapseInternalToolCalls(messages, mockLogger);
    expect(collapsedMessages).toEqual(messages);
  });

  it('should not collapse a query message if there are no messages after it', () => {
    const messages: Message[] = [
      {
        '@timestamp': '2025-07-02T10:00:00Z',
        message: { role: MessageRole.User, content: 'hello' },
      },
      ...queryTool,
    ];
    const collapsedMessages = collapseInternalToolCalls(messages, mockLogger);
    expect(collapsedMessages).toEqual(messages);
  });

  describe('when a conversation contains a "query" followed by "execute_query" tool call', () => {
    let collapsedMessages: Message[];
    let messages: Message[];
    beforeEach(() => {
      messages = [
        userMessage('Please analyze my logs'),
        ...getDatasetInfoTool,
        ...queryTool,
        ...executeQueryTool,
        assistantMessage('Here is the result'),
        userMessage('What about the unique IPs?'),
      ];
      collapsedMessages = collapseInternalToolCalls(messages, mockLogger);
    });

    it('should have the right messages after collapsing', () => {
      const formatMessages = (msg: Message) => ({
        role: msg.message.role,
        toolName: msg.message.function_call?.name,
      });

      // before collapsing
      expect(messages.map(formatMessages)).toEqual([
        { role: 'user' },
        { role: 'assistant', toolName: 'get_dataset_info' },
        { role: 'user' },
        { role: 'assistant', toolName: 'query' },
        { role: 'user' },
        { role: 'assistant', toolName: 'execute_query' },
        { role: 'user' },
        { role: 'assistant' },
        { role: 'user' },
      ]);

      // after collapsing
      expect(collapsedMessages.map(formatMessages)).toEqual([
        { role: 'user' },
        { role: 'assistant', toolName: 'get_dataset_info' },
        { role: 'user' },
        { role: 'assistant', toolName: 'query' },
        { role: 'user' },
        { role: 'assistant' },
        { role: 'user' },
      ]);
    });

    it('should retain the messages up until the query response', () => {
      expect(messages.slice(0, 4)).toEqual(collapsedMessages.slice(0, 4));
    });

    it('should retain the messages after the "execute_query" response', () => {
      expect(messages.slice(-2)).toEqual(collapsedMessages.slice(-2));
    });

    it('should remove the "execute_query" messages', () => {
      expect(collapsedMessages).not.toContain(executeQueryTool[0]);
      expect(collapsedMessages).not.toContain(executeQueryTool[1]);
    });

    it('should retain the "query" tool request', () => {
      expect(collapsedMessages).toContain(queryTool[0]);
    });

    it('should collapse the "execute_query" calls into the "query" tool response', () => {
      const queryToolResponse = collapsedMessages.find(
        (msg) => msg.message.role === MessageRole.User && msg.message.name === 'query'
      )!;

      const content = JSON.parse(queryToolResponse.message.content!);

      expect(content.steps).toHaveLength(2);
      expect(content.steps[0].role).toBe('assistant');
      expect(content.steps[1].role).toBe('tool');
      expect(content.steps[1].name).toBe('execute_query');
      expect(content.steps).toEqual([
        {
          content: null,
          role: 'assistant',
          toolCalls: [
            {
              function: { arguments: { query: 'FROM logs' }, name: 'execute_query' },
              toolCallId: expect.any(String),
            },
          ],
        },
        {
          name: 'execute_query',
          response: {
            columns: [{ id: 'unique_ips', meta: { type: 'number' }, name: 'unique_ips' }],
            rows: [[324567]],
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
        ...getDatasetInfoTool,
        ...queryTool,
        ...visualizeQueryTool,
        assistantMessage('Here is the result'),
        userMessage('What about the unique IPs?'),
      ];

      collapsedMessages = collapseInternalToolCalls(messages, mockLogger);
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

  describe('when an unrelated tool call is present', () => {
    let collapsedMessages: Message[];
    beforeEach(() => {
      const messages: Message[] = [
        ...queryTool,
        ...executeQueryTool,
        {
          '@timestamp': '2025-07-02T10:02:00Z',
          message: {
            role: MessageRole.Assistant,
            function_call: {
              name: 'some_other_function',
              arguments: JSON.stringify({ user: 'george' }),
              trigger: MessageRole.Assistant,
            },
            content: undefined,
          },
        },
      ];
      collapsedMessages = collapseInternalToolCalls(messages, mockLogger);
    });

    it('should stop collapsing and preserve the unrelated tool call', () => {
      expect(collapsedMessages).toHaveLength(3);
    });

    it('should add "execute_query" to the "query" response', () => {
      const queryToolResponse = collapsedMessages[1];
      expect(queryToolResponse.message.content).toContain('execute_query');
    });

    it('should retain the unrelated tool call as the last message', () => {
      expect(collapsedMessages[2].message.function_call?.name).toEqual('some_other_function');
    });
  });
});

describe('convertMessagesForInference', () => {});
