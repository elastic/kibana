/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationAnalyzer } from './conversation_analyzer';

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn(),
});

describe('ConversationAnalyzer', () => {
  describe('extractToolUsage', () => {
    it('counts tool_calls correctly and sorts by frequency desc', () => {
      const messages = [
        {
          role: 'assistant',
          tool_calls: [{ function: { name: 'esql_query' } }, { function: { name: 'get_alert' } }],
        },
        {
          role: 'assistant',
          tool_calls: [{ function: { name: 'esql_query' } }, { function: { name: 'esql_query' } }],
        },
        {
          role: 'assistant',
          tool_calls: [{ function: { name: 'get_alert' } }],
        },
        {
          role: 'user',
          content: 'What happened?',
        },
      ];

      const result = ConversationAnalyzer.extractToolUsage(messages);

      expect(result).toEqual([
        { tool: 'esql_query', count: 3 },
        { tool: 'get_alert', count: 2 },
      ]);
    });

    it('returns empty array when no tool_calls exist', () => {
      const messages = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
      ];

      const result = ConversationAnalyzer.extractToolUsage(messages);
      expect(result).toEqual([]);
    });
  });

  describe('extractESQLPatterns', () => {
    it('extracts esql code blocks from assistant messages', () => {
      const messages = [
        {
          role: 'assistant',
          content:
            'Here is a query:\n```esql\nFROM logs-* | WHERE host.name == "server1" | LIMIT 10\n```\nThat should help.',
        },
        {
          role: 'assistant',
          content:
            'Another one:\n```esql\nFROM .alerts-security.alerts-default | STATS count = COUNT(*) BY event.action\n```',
        },
      ];

      const result = ConversationAnalyzer.extractESQLPatterns(messages);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('FROM logs-* | WHERE host.name == "server1" | LIMIT 10');
      expect(result[1]).toBe(
        'FROM .alerts-security.alerts-default | STATS count = COUNT(*) BY event.action'
      );
    });

    it('ignores esql blocks in user messages', () => {
      const messages = [
        {
          role: 'user',
          content: '```esql\nFROM logs-* | LIMIT 5\n```',
        },
        {
          role: 'assistant',
          content: 'No esql here, just text.',
        },
      ];

      const result = ConversationAnalyzer.extractESQLPatterns(messages);
      expect(result).toEqual([]);
    });

    it('returns empty array when no esql blocks exist', () => {
      const messages = [{ role: 'assistant', content: 'Here is some text without code blocks.' }];

      const result = ConversationAnalyzer.extractESQLPatterns(messages);
      expect(result).toEqual([]);
    });
  });

  describe('extractFailureModes', () => {
    it('finds Error: messages from tool role and ignores successes', () => {
      const messages = [
        {
          role: 'tool',
          name: 'esql_query',
          content: 'Error: index_not_found_exception: no such index [logs-missing]',
        },
        {
          role: 'tool',
          name: 'get_alert',
          content: '{"alert_id": "abc123", "status": "active"}',
        },
        {
          role: 'tool',
          name: 'esql_query',
          content: 'Error: index_not_found_exception: no such index [logs-missing]',
        },
        {
          role: 'tool',
          name: 'search_index',
          content: 'Error: search_phase_execution_exception: all shards failed',
        },
      ];

      const result = ConversationAnalyzer.extractFailureModes(messages);

      expect(result).toHaveLength(2);
      // The duplicate esql_query error should be counted
      const esqlError = result.find((f) => f.tool === 'esql_query');
      expect(esqlError).toBeDefined();
      expect(esqlError!.count).toBe(2);
      expect(esqlError!.error).toContain('index_not_found_exception');

      const searchError = result.find((f) => f.tool === 'search_index');
      expect(searchError).toBeDefined();
      expect(searchError!.count).toBe(1);
    });

    it('returns empty array when no errors exist', () => {
      const messages = [
        { role: 'tool', name: 'esql_query', content: 'success' },
        { role: 'assistant', content: 'Everything looks good.' },
      ];

      const result = ConversationAnalyzer.extractFailureModes(messages);
      expect(result).toEqual([]);
    });
  });

  describe('extractRecurringFlows', () => {
    it('detects repeated tool sequences across conversations', () => {
      // Two conversations with the same tool sequence
      const conversations = [
        {
          messages: [
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'get_alert' } }],
            },
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'esql_query' } }],
            },
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'search_index' } }],
            },
          ],
        },
        {
          messages: [
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'get_alert' } }],
            },
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'esql_query' } }],
            },
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'search_index' } }],
            },
          ],
        },
        {
          messages: [
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'unrelated_tool' } }],
            },
          ],
        },
      ];

      const result = ConversationAnalyzer.extractRecurringFlows(conversations);

      // Should find the bigram "get_alert → esql_query" repeated 2x
      const getAlertToEsql = result.find(
        (f) => f.steps.length === 2 && f.steps[0] === 'get_alert' && f.steps[1] === 'esql_query'
      );
      expect(getAlertToEsql).toBeDefined();
      expect(getAlertToEsql!.frequency).toBe(2);

      // Should also find "esql_query → search_index" repeated 2x
      const esqlToSearch = result.find(
        (f) => f.steps.length === 2 && f.steps[0] === 'esql_query' && f.steps[1] === 'search_index'
      );
      expect(esqlToSearch).toBeDefined();
      expect(esqlToSearch!.frequency).toBe(2);
    });

    it('returns empty array when no repeated flows exist', () => {
      const conversations = [
        {
          messages: [
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'tool_a' } }],
            },
          ],
        },
        {
          messages: [
            {
              role: 'assistant',
              tool_calls: [{ function: { name: 'tool_b' } }],
            },
          ],
        },
      ];

      const result = ConversationAnalyzer.extractRecurringFlows(conversations);
      expect(result).toEqual([]);
    });
  });

  describe('analyze', () => {
    it('returns empty insights when index does not exist (404)', async () => {
      const mockEsClient = {
        search: jest.fn().mockRejectedValue({
          meta: { statusCode: 404 },
          message: 'index_not_found_exception',
        }),
      };
      const logger = createMockLogger();

      const result = await ConversationAnalyzer.analyze(mockEsClient as any, logger as any);

      expect(result).toEqual({
        toolUsage: [],
        esqlPatterns: [],
        failureModes: [],
        recurringFlows: [],
        totalConversations: 0,
        totalMessages: 0,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('returns empty insights on ES error', async () => {
      const mockEsClient = {
        search: jest.fn().mockRejectedValue(new Error('Connection refused')),
      };
      const logger = createMockLogger();

      const result = await ConversationAnalyzer.analyze(mockEsClient as any, logger as any);

      expect(result).toEqual({
        toolUsage: [],
        esqlPatterns: [],
        failureModes: [],
        recurringFlows: [],
        totalConversations: 0,
        totalMessages: 0,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('processes conversations and returns combined insights', async () => {
      // Implementation uses conversation_rounds format (Agent Builder .chat-conversations schema)
      const mockConversations = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _source: {
                // Conv 1: one round with an esql_query tool call and error result,
                // plus an assistant response containing an ESql code block.
                // Produces 2 messages: tool result + assistant response (no user input)
                conversation_rounds: [
                  {
                    steps: [
                      {
                        type: 'tool_call',
                        tool_id: 'esql_query',
                        results: 'Error: parsing_exception: line 1:0 mismatched input',
                      },
                    ],
                    response: {
                      message: '```esql\nFROM logs-* | STATS count = COUNT(*) BY host.name\n```',
                    },
                  },
                ],
              },
            },
            {
              _source: {
                // Conv 2: two rounds each with a different tool call and no response text.
                // Produces 2 messages: two assistant-with-tool_calls entries
                conversation_rounds: [
                  {
                    steps: [{ type: 'tool_call', tool_id: 'esql_query' }],
                  },
                  {
                    steps: [{ type: 'tool_call', tool_id: 'get_alert' }],
                  },
                ],
              },
            },
          ],
        },
      };

      const mockEsClient = {
        search: jest.fn().mockResolvedValue(mockConversations),
      };
      const logger = createMockLogger();

      const result = await ConversationAnalyzer.analyze(mockEsClient as any, logger as any);

      expect(result.totalConversations).toBe(2);
      expect(result.totalMessages).toBe(4);
      expect(result.toolUsage.length).toBeGreaterThan(0);
      expect(result.toolUsage[0].tool).toBe('esql_query');
      expect(result.esqlPatterns.length).toBe(1);
      expect(result.failureModes.length).toBe(1);
    });
  });
});
