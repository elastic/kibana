/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import { compact, last } from 'lodash';
import { Observable } from 'rxjs';
import { FunctionRegistrationParameters } from '.';
import { MessageAddEvent } from '../../common/conversation_complete';
import { FunctionVisibility } from '../../common/functions/types';
import { MessageRole } from '../../common/types';
import { createFunctionResponseMessage } from '../../common/utils/create_function_response_message';
import {
  KnowledgeBaseQueryContainer,
  KnowledgeBaseSource,
  KnowledgeBaseStatus,
} from '../service/knowledge_base_service/types';
import { recallAndScore } from '../utils/recall/recall_and_score';

const MAX_TOKEN_COUNT_FOR_DATA_ON_SCREEN = 1000;

export const CONTEXT_FUNCTION_NAME = 'context';

interface ContextToolResponseError {
  content: string;
  data: {
    error: {
      message: string;
    };
  };
}

interface ScreenContent {
  data_on_screen?: Array<{ name: string; description: string; value: unknown }> | undefined;
  screen_description: string;
}

export interface ContextToolResponseV1 {
  content: ScreenContent & {
    learnings: Array<{
      text: string;
      score: string;
      id: string;
    }>;
  };
  data: {
    scores: Array<{
      id: string;
      score: number;
    }>;
    suggestions: Array<{
      text: string;
      score: number;
      id: string;
    }>;
  };
}

interface ContextEntryFormatted {
  id: string;
  title: string;
  document: unknown;
  relevanceScore: number | null;
  llmScore: number | null;
}

export interface ContextEntry {
  id: string;
  title: string;
  text: string;
  document: unknown;
  source: KnowledgeBaseSource;
  score: number | null;
  llmScore: number | null;
  selected: boolean;
  truncated?: {
    truncatedText: string;
    truncatedTokenCount: number;
    originalTokenCount: number;
  };
}

export interface ContextToolResponseV2 {
  content: ScreenContent & {
    entries: ContextEntryFormatted[];
  };
  data: {
    entries: ContextEntry[];
    queries: KnowledgeBaseQueryContainer[];
  };
}

export type ContextToolResponse =
  | ContextToolResponseV1
  | ContextToolResponseV2
  | ContextToolResponseError;

export function registerContextFunction({
  client,
  functions,
  resources,
  knowledgeBaseStatus,
}: FunctionRegistrationParameters & { knowledgeBaseStatus: KnowledgeBaseStatus }) {
  functions.registerAdhocInstruction({
    instruction_type: 'application_instruction',
    text: `When citing sources from what is returned from the ${CONTEXT_FUNCTION_NAME},
      make sure to link to them, using the URL of the source.`,
  });

  functions.registerFunction(
    {
      name: CONTEXT_FUNCTION_NAME,
      description:
        'This function provides context as to what the user is looking at on their screen, and recalled documents from the knowledge base that matches their query',
      visibility: FunctionVisibility.Internal,
    },
    async ({ messages, screenContexts, chat, connectorId, simulateFunctionCalling }, signal) => {
      const { analytics } = await resources.plugins.core.start();

      async function getContext(): Promise<ContextToolResponseV2> {
        const screenDescription = compact(
          screenContexts.map((context) => context.screenDescription)
        ).join('\n\n');
        // any data that falls within the token limit, send it automatically

        const dataWithinTokenLimit = compact(
          screenContexts.flatMap((context) => context.data)
        ).filter(
          (data) => encode(JSON.stringify(data.value)).length <= MAX_TOKEN_COUNT_FOR_DATA_ON_SCREEN
        );

        const content = {
          screen_description: screenDescription,
          entries: [],
          ...(dataWithinTokenLimit.length ? { data_on_screen: dataWithinTokenLimit } : {}),
        };

        if (!knowledgeBaseStatus.enabled || !knowledgeBaseStatus.has_any_docs) {
          return {
            content,
            data: {
              entries: [],
              queries: [],
            },
          };
        }

        const userMessage = last(
          messages.filter((message) => message.message.role === MessageRole.User)
        );

        const userPrompt = userMessage?.message.content!;

        const inferenceClient = (await resources.plugins.inference.start()).getClient({
          bindTo: {
            connectorId,
            functionCalling: simulateFunctionCalling ? 'simulated' : 'auto',
          },
          request: resources.request,
        });

        const { scores, entries, selected, queries } = await recallAndScore({
          recall: client.recall,
          chat,
          logger: resources.logger,
          userPrompt,
          context: screenDescription,
          messages,
          signal,
          analytics,
          inferenceClient,
        });

        const entriesWithScores = entries.map((entry): ContextEntry => {
          const llmScore = scores?.get(entry.id);

          return {
            selected: selected.includes(entry.id),
            document: entry.document,
            id: entry.id,
            title: entry.title,
            score: entry.score,
            source: entry.source,
            text: entry.text,
            truncated: entry.truncated,
            llmScore: llmScore ?? null,
          };
        });

        return {
          content: {
            ...content,
            entries: entriesWithScores
              .filter((entry) => entry.selected)
              .map((entry): ContextEntryFormatted => {
                return {
                  id: entry.id,
                  title: entry.title,
                  llmScore: entry.llmScore,
                  relevanceScore: entry.score,
                  document: 'internal' in entry.source ? entry.text : entry.document,
                };
              }),
          },
          data: {
            queries,
            entries: entriesWithScores,
          },
        };
      }

      return new Observable<MessageAddEvent>((subscriber) => {
        getContext()
          .then(({ content, data }) => {
            subscriber.next(
              createFunctionResponseMessage({
                name: CONTEXT_FUNCTION_NAME,
                content,
                data,
              })
            );

            subscriber.complete();
          })
          .catch((error) => {
            resources.logger.error('Error in context function');
            resources.logger.error(error);

            subscriber.next(
              createFunctionResponseMessage({
                name: CONTEXT_FUNCTION_NAME,
                content: `Error in context function: ${error.message}`,
                data: {
                  error: {
                    message: error.message,
                  },
                },
              })
            );
            subscriber.complete();
          });
      });
    }
  );
}
