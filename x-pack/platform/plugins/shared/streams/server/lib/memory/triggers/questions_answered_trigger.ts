/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { z } from '@kbn/zod/v4';
import type { MemoryEntry } from '../types';
import type { MemoryUpdateTrigger } from './types';

export const QUESTIONS_ANSWERED_TRIGGER_ID = 'questions-answered';

const MAX_ESQL_ROWS = 100;

interface EntryUpdate {
  entry_id: string;
  action: 'update' | 'delete';
  new_content?: string;
  reason: string;
}

const questionAnswerPrompt = createPrompt({
  name: 'memory_question_answer',
  input: z.object({
    question: z.string(),
    answer: z.string(),
    entry_index: z.string(),
    related_entry_ids: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: [
          "You are updating a knowledge base based on a user's answer to a question about the knowledge base state.",
          '',
          'Use the available tools to:',
          '1. Read the related memory entries to understand the current state',
          '2. Read other entries if needed for cross-referencing',
          '3. Optionally check insights or run ES|QL queries to verify facts',
          '4. Submit your updates via `submit_updates`',
          '',
          'Guidelines:',
          "- Incorporate the user's answer naturally into the entry content",
          '- Preserve the existing structure and writing style of entries',
          '- If the answer makes an entry obsolete, mark it for deletion',
          '- If the answer affects multiple entries, update all of them',
          '- Provide a clear reason for each change',
        ].join('\n'),
      },
    },
    template: {
      mustache: {
        template: [
          '## Question that was asked',
          '{{question}}',
          '',
          "## User's answer",
          '{{answer}}',
          '',
          '## Related entry IDs',
          '{{related_entry_ids}}',
          '',
          '## All memory entries (index)',
          '{{entry_index}}',
          '',
          'Start by reading the related entries, then decide what updates are needed.',
        ].join('\n'),
      },
    },
    tools: {
      read_entry: {
        description:
          'Read the full content of a memory entry by its ID. Use this to inspect entries before updating them.',
        schema: {
          type: 'object' as const,
          properties: {
            entry_id: {
              type: 'string' as const,
              description: 'The ID of the memory entry to read',
            },
          },
          required: ['entry_id'] as const,
        },
      },
      get_insights: {
        description:
          'List recent insights (knowledge indicators) from discovery. Useful for cross-referencing facts.',
        schema: {
          type: 'object' as const,
          properties: {},
        },
      },
      execute_esql: {
        description:
          'Run an ES|QL query against Elasticsearch to verify facts or gather data. Returns columns and rows.',
        schema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string' as const,
              description: 'The ES|QL query to execute',
            },
          },
          required: ['query'] as const,
        },
      },
      submit_updates: {
        description:
          'Submit the list of entry updates and/or deletions. Call this once when done analyzing.',
        schema: {
          type: 'object' as const,
          properties: {
            updates: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  entry_id: {
                    type: 'string' as const,
                    description: 'ID of the entry to update or delete',
                  },
                  action: {
                    type: 'string' as const,
                    enum: ['update', 'delete'],
                  },
                  new_content: {
                    type: 'string' as const,
                    description: 'Updated content for the entry (required when action is "update")',
                  },
                  reason: {
                    type: 'string' as const,
                    description: 'Brief explanation of why this change is needed',
                  },
                },
                required: ['entry_id', 'action', 'reason'] as const,
              },
            },
          },
          required: ['updates'] as const,
        },
      },
    },
  })
  .get();

/**
 * Trigger that fires when a user answers open questions on the memory page.
 * Uses a reasoning agent to read entries, cross-reference with insights and data,
 * then incorporate the answer into relevant memory entries.
 *
 * Expected payload: { questionId: string; question: string; answer: string; relatedEntryIds: string[] }
 */
export const questionsAnsweredTrigger: MemoryUpdateTrigger = {
  id: QUESTIONS_ANSWERED_TRIGGER_ID,
  description:
    'Fires when a user answers open questions about memory state. Uses a reasoning agent to incorporate answers into relevant memory entries.',
  execute: async (context) => {
    const { memory, spaceId, logger, trigger, inferenceClient, esClient, insightClient } = context;
    const { question, answer, relatedEntryIds } = trigger.payload as {
      questionId: string;
      question: string;
      answer: string;
      relatedEntryIds: string[];
    };

    if (!answer || answer.trim().length === 0) {
      logger.debug('Empty answer provided, skipping');
      return;
    }

    if (!inferenceClient) {
      logger.debug('No inference client available — cannot run reasoning agent');
      return;
    }

    logger.info(
      `Processing answer for question with ${relatedEntryIds?.length ?? 0} related entries`
    );

    const entries = await memory.listAll({ space: spaceId });
    const entryMap = new Map<string, MemoryEntry>(entries.map((e) => [e.id, e]));

    const entryIndex = entries
      .map((e) => `- [${e.id}] ${e.path} — "${e.title}" (tags: ${e.tags.join(', ')})`)
      .join('\n');

    let submittedUpdates: EntryUpdate[] = [];

    await executeAsReasoningAgent({
      inferenceClient,
      prompt: questionAnswerPrompt,
      input: {
        question,
        answer,
        entry_index: entryIndex,
        related_entry_ids: (relatedEntryIds ?? []).join(', '),
      },
      maxSteps: 8,
      finalToolChoice: { function: 'submit_updates' },
      toolCallbacks: {
        read_entry: async (toolCall) => {
          const { entry_id: entryId } = toolCall.function.arguments;
          const entry = entryMap.get(entryId);
          if (!entry) {
            return { response: { error: `Entry ${entryId} not found` } };
          }
          return {
            response: {
              id: entry.id,
              path: entry.path,
              title: entry.title,
              tags: entry.tags,
              content: entry.content,
            },
          };
        },
        get_insights: async () => {
          if (!insightClient) {
            return { response: { error: 'Insight client not available' } };
          }
          try {
            const { insights } = await insightClient.list();
            return {
              response: {
                insights: insights.map((i) => ({
                  id: i.id,
                  title: i.title,
                  description: i.description,
                  impact: i.impact,
                })),
                count: insights.length,
              },
            };
          } catch (err) {
            return { response: { error: (err as Error).message } };
          }
        },
        execute_esql: async (toolCall) => {
          if (!esClient) {
            return { response: { error: 'ES client not available' } };
          }
          try {
            const result = await esClient.esql.query({
              query: toolCall.function.arguments.query,
              format: 'json',
            });
            const rows = (result.values ?? []).slice(0, MAX_ESQL_ROWS);
            return {
              response: {
                columns: result.columns,
                rows,
                total_rows: result.values?.length ?? 0,
                truncated: (result.values?.length ?? 0) > MAX_ESQL_ROWS,
              },
            };
          } catch (err) {
            return { response: { error: (err as Error).message } };
          }
        },
        submit_updates: async (toolCall) => {
          const { updates } = toolCall.function.arguments;
          submittedUpdates = (updates ?? [])
            .filter(
              (u) =>
                typeof u.entry_id === 'string' &&
                (u.action === 'update' || u.action === 'delete') &&
                typeof u.reason === 'string'
            )
            .map((u) => ({
              entry_id: u.entry_id!,
              action: u.action as 'update' | 'delete',
              new_content: u.new_content,
              reason: u.reason!,
            }));
          return { response: { accepted: submittedUpdates.length } };
        },
      },
    });

    logger.debug(`Agent submitted ${submittedUpdates.length} entry updates`);

    const user = 'system:questions-answered-trigger';

    for (const update of submittedUpdates) {
      if (!entryMap.has(update.entry_id)) {
        logger.warn(`Skipping update for unknown entry ${update.entry_id}`);
        continue;
      }

      try {
        if (update.action === 'delete') {
          await memory.delete({ id: update.entry_id, space: spaceId, user });
          logger.debug(`Deleted entry ${update.entry_id}: ${update.reason}`);
        } else if (update.action === 'update' && update.new_content) {
          await memory.update({
            id: update.entry_id,
            content: update.new_content,
            space: spaceId,
            user,
            changeSummary: `Updated based on answered question: "${question}" — ${update.reason}`,
          });
          logger.debug(`Updated entry ${update.entry_id}: ${update.reason}`);
        }
      } catch (err) {
        logger.warn(
          `Failed to apply update to entry ${update.entry_id}: ${(err as Error).message}`
        );
      }
    }
  },
};
