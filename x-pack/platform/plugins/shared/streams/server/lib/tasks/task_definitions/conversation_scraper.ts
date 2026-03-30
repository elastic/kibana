/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import { MemoryServiceImpl } from '../../memory';
import { createAskQuestionCallback } from '../../memory/ask_question_tool';
import { ConversationScraperPrompt } from './conversation_scraper_prompt';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConversationScraperTaskParams {}

export interface ConversationScraperTaskResult {
  conversationsProcessed: number;
}

export const CONVERSATION_SCRAPER_TASK_TYPE = 'streams_conversation_scraper';

const LAST_SCRAPE_PATH = '_system/last_scrape_timestamp';
const CONVERSATIONS_INDEX = chatSystemIndex('conversations');

export function createStreamsConversationScraperTask(taskContext: TaskContext) {
  return {
    [CONVERSATION_SCRAPER_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { _task } = runContext.taskInstance
                .params as TaskParams<ConversationScraperTaskParams>;

              const { taskClient, inferenceClient, modelSettingsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('conversation_scraper');

              const settings = await modelSettingsClient.getSettings();

              if (!settings.useMemory) {
                taskLogger.info('Memory is disabled, skipping conversation scraping');
                if (_task) {
                  await taskClient.complete<
                    ConversationScraperTaskParams,
                    ConversationScraperTaskResult
                  >(_task, {}, { conversationsProcessed: 0 });
                }
                return;
              }

              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdDiscovery,
                uiSettingsClient,
                logger: taskLogger,
              });

              taskLogger.info(`Using connector ${connectorId} for conversation scraping`);

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              const esClient = taskContext.getInternalEsClient();

              try {
                // Read last scrape timestamp from memory
                const lastScrapeEntry = await memory.getByPath({ path: LAST_SCRAPE_PATH });
                const lastScrapeTime = lastScrapeEntry?.content?.trim() ?? '1970-01-01T00:00:00Z';

                taskLogger.info(`Scraping conversations updated since ${lastScrapeTime}`);

                // Query conversations updated since last scrape
                const searchResult = await esClient.search({
                  index: CONVERSATIONS_INDEX,
                  size: 100,
                  sort: [{ updated_at: 'asc' }],
                  query: {
                    range: {
                      updated_at: { gt: lastScrapeTime },
                    },
                  },
                  _source: ['id', 'title', 'conversation_rounds', 'updated_at', 'user'],
                });

                const conversations = searchResult.hits.hits;

                if (conversations.length === 0) {
                  taskLogger.info('No new conversations to scrape');
                  if (_task) {
                    await taskClient.complete<
                      ConversationScraperTaskParams,
                      ConversationScraperTaskResult
                    >(_task, {}, { conversationsProcessed: 0 });
                  }
                  return;
                }

                taskLogger.info(`Found ${conversations.length} conversation(s) to process`);

                // Build conversation summaries for the agent
                const conversationSummaries = conversations
                  .map((hit, idx) => {
                    const source = hit._source as Record<string, unknown>;
                    const rounds = source.conversation_rounds as
                      | Array<Record<string, unknown>>
                      | undefined;
                    const roundCount = rounds?.length ?? 0;
                    const title = String(source.title ?? 'Untitled');
                    return `[${idx}] "${title}" (${roundCount} rounds)`;
                  })
                  .join('\n');

                // Load existing memory tree for context
                const allEntries = await memory.listAll();
                const existingPages =
                  allEntries.length > 0
                    ? allEntries.map((e) => `- **${e.path}** — ${e.title}`).join('\n')
                    : 'No existing memory entries.';

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                let pagesWritten = 0;

                await executeAsReasoningAgent({
                  inferenceClient: boundInferenceClient,
                  prompt: ConversationScraperPrompt,
                  input: {
                    conversationCount: conversations.length,
                    conversationSummaries,
                    existingPages,
                  },
                  maxSteps: 20,
                  toolCallbacks: {
                    get_conversation_details: async (toolCall) => {
                      const { index } = toolCall.function.arguments;

                      if (typeof index !== 'number' || index < 0 || index >= conversations.length) {
                        return {
                          response: {
                            error: `Invalid index ${index}. Valid range: 0-${
                              conversations.length - 1
                            }`,
                          },
                        };
                      }

                      const source = conversations[index]._source as Record<string, unknown>;
                      const rounds = source.conversation_rounds as
                        | Array<Record<string, unknown>>
                        | undefined;

                      // Extract user messages and assistant responses
                      // ES stores: input.message (user), response.message (assistant)
                      const roundSummaries = (rounds ?? []).map((round, rIdx) => {
                        const input = round.input as Record<string, unknown> | undefined;
                        const userMessage = String(input?.message ?? '');
                        const response = round.response as Record<string, unknown> | undefined;
                        const assistantContent = String(response?.message ?? '');

                        return {
                          round: rIdx,
                          user: userMessage.substring(0, 2000),
                          assistant: assistantContent.substring(0, 2000),
                        };
                      });

                      return {
                        response: {
                          title: source.title,
                          user: source.user,
                          rounds: roundSummaries,
                        },
                      };
                    },

                    read_memory_page: async (toolCall) => {
                      const { path } = toolCall.function.arguments;
                      const entry = await memory.getByPath({ path });
                      if (!entry) {
                        return { response: { error: `No page found at path "${path}"` } };
                      }
                      return {
                        response: {
                          path: entry.path,
                          title: entry.title,
                          content: entry.content,
                        },
                      };
                    },

                    ask_question: createAskQuestionCallback({
                      memory,
                      logger: taskLogger,
                      user: 'agent:conversation_scraper',
                    }),

                    write_memory_page: async (toolCall) => {
                      const { path, title, content, tags } = toolCall.function.arguments;
                      const user = 'agent:conversation_scraper';

                      const existing = await memory.getByPath({ path });

                      if (existing) {
                        await memory.update({
                          id: existing.id,
                          content,
                          title,
                          user,
                          changeSummary: 'Updated from conversation scraping',
                        });
                        taskLogger.info(`Updated memory page: ${path}`);
                      } else {
                        await memory.create({
                          path,
                          title,
                          content,
                          tags: [...(tags ?? []), 'auto-generated', 'conversation-scraper'],
                          user,
                        });
                        taskLogger.info(`Created memory page: ${path}`);
                      }

                      pagesWritten++;
                      return {
                        response: {
                          success: true,
                          action: existing ? 'updated' : 'created',
                          path,
                        },
                      };
                    },
                  },
                });

                // Update last scrape timestamp
                const latestTimestamp = conversations.reduce((latest, hit) => {
                  const ts = String((hit._source as Record<string, unknown>).updated_at ?? '');
                  return ts > latest ? ts : latest;
                }, lastScrapeTime);

                if (lastScrapeEntry) {
                  await memory.update({
                    id: lastScrapeEntry.id,
                    content: latestTimestamp,
                    user: 'agent:conversation_scraper',
                    changeSummary: 'Updated last scrape timestamp',
                  });
                } else {
                  await memory.create({
                    path: LAST_SCRAPE_PATH,
                    title: 'Last Scrape Timestamp',
                    content: latestTimestamp,
                    tags: ['system'],
                    user: 'agent:conversation_scraper',
                  });
                }

                taskLogger.info(
                  `Conversation scraping completed: ${conversations.length} conversation(s) processed, ${pagesWritten} page(s) written`
                );

                if (_task) {
                  await taskClient.complete<
                    ConversationScraperTaskParams,
                    ConversationScraperTaskResult
                  >(_task, {}, { conversationsProcessed: conversations.length });
                }
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Conversation scraper failed: ${errorMessage}`);

                if (_task) {
                  await taskClient.fail<ConversationScraperTaskParams>(_task, {}, errorMessage);
                }

                return getDeleteTaskRunResult();
              }
            },
            runContext,
            taskContext
          ),
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}
