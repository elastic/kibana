/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const CONVERSATIONS_INDEX = '.chat-conversations';

export interface ConversationInsights {
  toolUsage: Array<{ tool: string; count: number }>;
  esqlPatterns: string[];
  failureModes: Array<{ error: string; tool: string; count: number }>;
  recurringFlows: Array<{ steps: string[]; frequency: number }>;
  totalConversations: number;
  totalMessages: number;
}

// Internal normalized message format used by extractors
interface ConversationMessage {
  role: string;
  content?: string;
  name?: string;
  tool_calls?: Array<{
    function: {
      name: string;
    };
  }>;
}

// Agent Builder .chat-conversations document shape
interface ChatConversationDoc {
  created_at?: string;
  updated_at?: string;
  conversation_rounds?: Array<{
    input?: { message?: string };
    steps?: Array<{
      type?: string;
      tool_id?: string;
      results?: string;
    }>;
    response?: { message?: string };
  }>;
}

const EMPTY_INSIGHTS: ConversationInsights = {
  toolUsage: [],
  esqlPatterns: [],
  failureModes: [],
  recurringFlows: [],
  totalConversations: 0,
  totalMessages: 0,
};

/**
 * Convert an Agent Builder conversation_rounds document into the
 * normalized ConversationMessage[] format used by the extractors.
 */
function toMessages(doc: ChatConversationDoc): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  const rounds = doc.conversation_rounds;
  if (!Array.isArray(rounds)) return messages;

  for (const round of rounds) {
    // User input
    if (round.input?.message) {
      messages.push({ role: 'user', content: round.input.message });
    }

    // Tool call steps
    const toolCalls: Array<{ function: { name: string } }> = [];
    if (Array.isArray(round.steps)) {
      for (const step of round.steps) {
        if (step.type === 'tool_call' && step.tool_id) {
          toolCalls.push({ function: { name: step.tool_id } });
          // Tool result
          if (step.results) {
            const resultStr =
              typeof step.results === 'string' ? step.results : JSON.stringify(step.results);
            messages.push({ role: 'tool', name: step.tool_id, content: resultStr });
          }
        }
      }
    }

    // Assistant response (with tool_calls if any were made in this round)
    if (round.response?.message) {
      messages.push({
        role: 'assistant',
        content: round.response.message,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
    } else if (toolCalls.length > 0) {
      messages.push({ role: 'assistant', tool_calls: toolCalls });
    }
  }

  return messages;
}

export class ConversationAnalyzer {
  /**
   * Count tool_calls by name across all messages, sorted by frequency descending.
   */
  static extractToolUsage(messages: ConversationMessage[]): Array<{ tool: string; count: number }> {
    const counts = new Map<string, number>();

    for (const msg of messages) {
      if (!msg.tool_calls) continue;
      for (const call of msg.tool_calls) {
        const name = call.function?.name;
        if (name) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Extract ES|QL code blocks from assistant messages via regex.
   */
  static extractESQLPatterns(messages: ConversationMessage[]): string[] {
    const patterns: string[] = [];
    const esqlRegex = /```esql\s*\n([\s\S]*?)```/g;

    for (const msg of messages) {
      if (msg.role !== 'assistant' || !msg.content) continue;

      let match: RegExpExecArray | null;
      while ((match = esqlRegex.exec(msg.content)) !== null) {
        const query = match[1].trim();
        if (query.length > 0) {
          patterns.push(query);
        }
      }
    }

    return patterns;
  }

  /**
   * Find tool role messages containing "Error:", returning { error, tool, count }.
   */
  static extractFailureModes(
    messages: ConversationMessage[]
  ): Array<{ error: string; tool: string; count: number }> {
    const errorMap = new Map<string, { error: string; tool: string; count: number }>();

    for (const msg of messages) {
      if (msg.role !== 'tool' || !msg.content) continue;
      if (!msg.content.startsWith('Error:')) continue;

      const tool = msg.name ?? 'unknown';
      const errorText = msg.content.slice(0, 200);
      const key = `${tool}::${errorText}`;

      const existing = errorMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        errorMap.set(key, { error: errorText, tool, count: 1 });
      }
    }

    return Array.from(errorMap.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Extract tool call sequences per conversation, find bigram patterns
   * that repeat across multiple conversations.
   */
  static extractRecurringFlows(
    conversations: Array<{ messages: ConversationMessage[] }>
  ): Array<{ steps: string[]; frequency: number }> {
    const globalBigramCounts = new Map<string, number>();

    for (const conv of conversations) {
      const toolSequence: string[] = [];
      for (const msg of conv.messages) {
        if (!msg.tool_calls) continue;
        for (const call of msg.tool_calls) {
          const name = call.function?.name;
          if (name) {
            toolSequence.push(name);
          }
        }
      }

      const seenInConversation = new Set<string>();
      for (let i = 0; i < toolSequence.length - 1; i++) {
        const bigram = `${toolSequence[i]}\0${toolSequence[i + 1]}`;
        seenInConversation.add(bigram);
      }

      for (const bigram of seenInConversation) {
        globalBigramCounts.set(bigram, (globalBigramCounts.get(bigram) ?? 0) + 1);
      }
    }

    return Array.from(globalBigramCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([key, frequency]) => ({
        steps: key.split('\0'),
        frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Queries ES for recent Agent Builder conversations from .chat-conversations,
   * normalizes the conversation_rounds format to messages, runs all extractors.
   */
  static async analyze(
    esClient: ElasticsearchClient,
    logger: Logger
  ): Promise<ConversationInsights> {
    try {
      const result = await esClient.search<ChatConversationDoc>({
        index: CONVERSATIONS_INDEX,
        size: 100,
        query: {
          range: {
            updated_at: {
              gte: 'now-30d',
            },
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
      });

      const hits = result.hits.hits;
      if (hits.length === 0) {
        return { ...EMPTY_INSIGHTS };
      }

      const conversations: Array<{ messages: ConversationMessage[] }> = [];
      const allMessages: ConversationMessage[] = [];

      for (const hit of hits) {
        const doc = hit._source;
        if (!doc) continue;
        const messages = toMessages(doc);
        if (messages.length === 0) continue;
        conversations.push({ messages });
        allMessages.push(...messages);
      }

      return {
        toolUsage: ConversationAnalyzer.extractToolUsage(allMessages),
        esqlPatterns: ConversationAnalyzer.extractESQLPatterns(allMessages),
        failureModes: ConversationAnalyzer.extractFailureModes(allMessages),
        recurringFlows: ConversationAnalyzer.extractRecurringFlows(conversations),
        totalConversations: conversations.length,
        totalMessages: allMessages.length,
      };
    } catch (error) {
      logger.warn(
        `[AESOP] Could not analyze Agent Builder conversations: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { ...EMPTY_INSIGHTS };
    }
  }
}
