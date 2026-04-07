/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { ReadOnlyConversationClient } from '@kbn/agent-builder-plugin/server';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorForSignificantEventsDiscovery } from '../../../routes/utils/resolve_connector_for_feature';
import {
  MemoryServiceImpl,
  formatExistingPages,
  createReadMemoryPageCallback,
  createWriteMemoryPageCallback,
} from '../../memory';
import { ConversationScraperPrompt } from './conversation_scraper_prompt';

export type ConversationScraperTaskParams = Record<string, never>;

export interface ConversationScraperTaskResult {
  conversationsProcessed: number;
}

export const CONVERSATION_SCRAPER_TASK_TYPE = 'streams_conversation_scraper';

const LAST_SCRAPE_NAME = '_system/last_scrape_timestamp';
const MAX_CONVERSATIONS_PER_SCRAPE = 100;

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

              const { taskClient, inferenceClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('conversation_scraper');

              const useMemory = await uiSettingsClient.get<boolean>(
                OBSERVABILITY_STREAMS_ENABLE_MEMORY
              );

              if (!useMemory) {
                taskLogger.info('Memory is disabled, skipping conversation scraping');
                if (_task) {
                  await taskClient.complete<
                    ConversationScraperTaskParams,
                    ConversationScraperTaskResult
                  >(_task, {}, { conversationsProcessed: 0 });
                }
                return;
              }

              const conversationsClient = await taskContext.getConversationsClient(
                runContext.fakeRequest
              );

              if (!conversationsClient) {
                taskLogger.info(
                  'Agent builder plugin not available, skipping conversation scraping'
                );
                if (_task) {
                  await taskClient.complete<
                    ConversationScraperTaskParams,
                    ConversationScraperTaskResult
                  >(_task, {}, { conversationsProcessed: 0 });
                }
                return;
              }

              const connectorId = await resolveConnectorForSignificantEventsDiscovery({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                request: runContext.fakeRequest,
              });

              taskLogger.info(
                `Using connector ${connectorId} for conversation scraping (discovery model)`
              );

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                // Read last scrape timestamp from memory
                const lastScrapeEntry = await memory.getByName({ name: LAST_SCRAPE_NAME });
                const lastScrapeTime = lastScrapeEntry?.content?.trim() ?? '1970-01-01T00:00:00Z';

                taskLogger.info(`Scraping conversations updated since ${lastScrapeTime}`);

                // List conversations and filter to those updated since last scrape
                const allConversations = await conversationsClient.list();
                const recentConversations = allConversations
                  .filter((c) => c.updated_at > lastScrapeTime)
                  .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
                  .slice(0, MAX_CONVERSATIONS_PER_SCRAPE);

                if (recentConversations.length === 0) {
                  taskLogger.info('No new conversations to scrape');
                  if (_task) {
                    await taskClient.complete<
                      ConversationScraperTaskParams,
                      ConversationScraperTaskResult
                    >(_task, {}, { conversationsProcessed: 0 });
                  }
                  return;
                }

                taskLogger.info(`Found ${recentConversations.length} conversation(s) to process`);

                // Cache for full conversations fetched on demand
                const fullConversationCache = new Map<number, Conversation>();

                // Build conversation summaries for the agent
                const conversationSummaries = recentConversations
                  .map((conv, idx) => {
                    const title = conv.title ?? 'Untitled';
                    return `[${idx}] "${title}"`;
                  })
                  .join('\n');

                // Load existing memory tree for context
                const allEntries = await memory.listAll();
                const existingPages = formatExistingPages(allEntries);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                let pagesWritten = 0;

                const writeCallback = createWriteMemoryPageCallback({
                  memory,
                  user: 'agent:conversation_scraper',
                  logger: taskLogger,
                  changeSummary: 'Updated from conversation scraping',
                });

                await executeAsReasoningAgent({
                  inferenceClient: boundInferenceClient,
                  prompt: ConversationScraperPrompt,
                  input: {
                    conversationCount: recentConversations.length,
                    conversationSummaries,
                    existingPages,
                  },
                  maxSteps: 20,
                  toolCallbacks: {
                    get_conversation_details: async (toolCall) => {
                      const { index } = toolCall.function.arguments;

                      if (
                        typeof index !== 'number' ||
                        index < 0 ||
                        index >= recentConversations.length
                      ) {
                        return {
                          response: {
                            error: `Invalid index ${index}. Valid range: 0-${
                              recentConversations.length - 1
                            }`,
                          },
                        };
                      }

                      const fullConversation = await getFullConversation(
                        index,
                        recentConversations,
                        conversationsClient,
                        fullConversationCache
                      );

                      const roundSummaries = (fullConversation.rounds ?? []).map((round, rIdx) => ({
                        round: rIdx,
                        user: round.input.message.substring(0, 2000),
                        assistant: round.response.message.substring(0, 2000),
                      }));

                      return {
                        response: {
                          title: fullConversation.title,
                          user: fullConversation.user,
                          rounds: roundSummaries,
                        },
                      };
                    },

                    read_memory_page: createReadMemoryPageCallback({ memory }),

                    write_memory_page: async (toolCall) => {
                      const result = await writeCallback(toolCall);
                      pagesWritten++;
                      return result;
                    },
                  },
                });

                // Update last scrape timestamp
                const latestTimestamp = recentConversations.reduce(
                  (latest, conv) => (conv.updated_at > latest ? conv.updated_at : latest),
                  lastScrapeTime
                );

                if (lastScrapeEntry) {
                  await memory.update({
                    id: lastScrapeEntry.id,
                    content: latestTimestamp,
                    user: 'agent:conversation_scraper',
                    changeSummary: 'Updated last scrape timestamp',
                  });
                } else {
                  await memory.create({
                    name: LAST_SCRAPE_NAME,
                    title: 'Last Scrape Timestamp',
                    content: latestTimestamp,
                    tags: ['system'],
                    user: 'agent:conversation_scraper',
                  });
                }

                taskLogger.info(
                  `Conversation scraping completed: ${recentConversations.length} conversation(s) processed, ${pagesWritten} page(s) written`
                );

                if (_task) {
                  await taskClient.complete<
                    ConversationScraperTaskParams,
                    ConversationScraperTaskResult
                  >(_task, {}, { conversationsProcessed: recentConversations.length });
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

async function getFullConversation(
  index: number,
  conversations: ConversationWithoutRounds[],
  client: ReadOnlyConversationClient,
  cache: Map<number, Conversation>
): Promise<Conversation> {
  const cached = cache.get(index);
  if (cached) {
    return cached;
  }
  const full = await client.get(conversations[index].id);
  cache.set(index, full);
  return full;
}
