/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collapseMessages } from './convert_messages_for_inference';
import { Message, MessageRole } from './types';

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

const queryToolCalls: Message[] = [
  {
    '@timestamp': '2025-07-02T10:00:00Z',
    message: {
      role: MessageRole.User,
      function_call: {
        name: 'query',
        arguments: '',
        trigger: MessageRole.Assistant,
      },
      content:
        'I can see that we have logs indices with a `client.ip` field. Let me create a query to count the unique IP addresses.',
    },
  },
  {
    '@timestamp': '2025-07-02T10:00:01Z',
    message: {
      role: MessageRole.User,
      data: JSON.stringify({
        keywords: ['STATS', 'COUNT_DISTINCT'],
        requestedDocumentation: {
          STATS: 'Aggregates data using statistical functions.',
          COUNT_DISTINCT: 'Counts distinct values in a field.',
        },
      }),
      name: 'query',
      content: '{}',
    },
  },
];

const executeQueryToolCall: Message[] = [
  {
    '@timestamp': '2025-07-02T10:01:00Z',
    message: {
      role: MessageRole.Assistant,
      function_call: {
        name: 'execute_query',
        arguments: '{"query":"FROM logs"}',
        trigger: MessageRole.Assistant,
      },
      content: undefined,
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

describe('collapseMessages', () => {
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
    const collapsedMessages = collapseMessages(messages, mockLogger);
    expect(collapsedMessages).toEqual(messages);
  });

  it('should not collapse a query message if there are no messages after it', () => {
    const messages: Message[] = [
      {
        '@timestamp': '2025-07-02T10:00:00Z',
        message: { role: MessageRole.User, content: 'hello' },
      },
      ...queryToolCalls,
    ];
    const collapsedMessages = collapseMessages(messages, mockLogger);
    expect(collapsedMessages).toEqual(messages);
  });

  describe('when collapsing an "execute_query" tool call', () => {
    let collapsedMessages: Message[];
    beforeEach(() => {
      const messages: Message[] = [...queryToolCalls, ...executeQueryToolCall];
      collapsedMessages = collapseMessages(messages, mockLogger);
    });

    it('should collapse the "execute_query" tool call into the "query" tool response', () => {
      expect(collapsedMessages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: expect.any(String),
            function_call: { arguments: '', name: 'query', trigger: 'assistant' },
            role: 'user',
          },
        },
        {
          '@timestamp': expect.any(String),
          message: {
            content: expect.stringContaining('execute_query'),
            data: expect.any(String),
            name: 'query',
            role: 'user',
          },
        },
      ]);
    });

    it('should retain the query tool request', () => {
      expect(collapsedMessages[0]).toEqual(queryToolCalls[0]);
    });

    it('should contain "execute_query" in "steps" property', () => {
      const content = JSON.parse(collapsedMessages[1].message.content!);

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
    beforeEach(() => {
      const visualizeQueryToolCall: Message[] = [
        {
          '@timestamp': '2025-07-02T10:01:00Z',
          message: {
            role: MessageRole.Assistant,
            function_call: {
              name: 'visualize_query',
              arguments: '{"query":"FROM logs | STATS count() BY response.keyword"}',
              trigger: MessageRole.Assistant,
            },
            content: undefined,
          },
        },
        {
          '@timestamp': '2025-07-02T10:01:01Z',
          message: {
            role: MessageRole.User,
            name: 'visualize_query',
            content: JSON.stringify({ viz: 'some vega spec' }),
          },
        },
      ];
      const messages: Message[] = [...queryToolCalls, ...visualizeQueryToolCall];
      collapsedMessages = collapseMessages(messages, mockLogger);
    });

    it('should collapse "visualize_query" into the "query" response', () => {
      expect(collapsedMessages[1].message.content).toContain('visualize_query');
    });

    it('should serialize the collapsed steps correctly', () => {
      const content = JSON.parse(collapsedMessages[1].message.content!);
      expect(content.steps).toHaveLength(2);
      expect(content.steps[0].role).toBe('assistant');
      expect(content.steps[1].role).toBe('tool');
      expect(content.steps[1].name).toBe('visualize_query');
    });
  });

  describe('when an unrelated tool call is present', () => {
    let collapsedMessages: Message[];
    beforeEach(() => {
      const messages: Message[] = [
        ...queryToolCalls,
        ...executeQueryToolCall,
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
      collapsedMessages = collapseMessages(messages, mockLogger);
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

  describe('when there are multiple query messages', () => {
    let collapsedMessages: Message[];
    beforeEach(() => {
      const messages: Message[] = [
        ...queryToolCalls,
        ...executeQueryToolCall,
        ...queryToolCalls,
        ...executeQueryToolCall,
      ];
      collapsedMessages = collapseMessages(messages, mockLogger);
    });

    it('should return four messages', () => {
      expect(collapsedMessages).toHaveLength(4);
    });

    it('should collapse the first query correctly', () => {
      const firstQueryResponse = collapsedMessages[1];
      const firstQueryContent = JSON.parse(firstQueryResponse.message.content!);
      expect(firstQueryContent.steps).toHaveLength(2);
    });

    it('should collapse the second query correctly', () => {
      const secondQueryResponse = collapsedMessages[3];
      const secondQueryContent = JSON.parse(secondQueryResponse.message.content!);
      expect(secondQueryContent.steps).toHaveLength(2);
    });
  });
});

describe('convertMessagesForInference', () => {});
