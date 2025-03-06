/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import { encode } from 'gpt-tokenizer';
import { compact, last } from 'lodash';
import { Observable } from 'rxjs';
import { FunctionRegistrationParameters } from '.';
import { MessageAddEvent } from '../../common/conversation_complete';
import { FunctionVisibility } from '../../common/functions/types';
import { MessageRole } from '../../common/types';
import { createFunctionResponseMessage } from '../../common/utils/create_function_response_message';
import { recallAndScore } from '../utils/recall/recall_and_score';

const MAX_TOKEN_COUNT_FOR_DATA_ON_SCREEN = 1000;

export const CONTEXT_FUNCTION_NAME = 'context';

export function registerContextFunction({
  client,
  functions,
  resources,
  isKnowledgeBaseReady,
}: FunctionRegistrationParameters & { isKnowledgeBaseReady: boolean }) {
  functions.registerFunction(
    {
      name: CONTEXT_FUNCTION_NAME,
      description:
        'This function provides context as to what the user is looking at on their screen, and recalled documents from the knowledge base that matches their query',
      visibility: FunctionVisibility.Internal,
    },
    async ({ messages, screenContexts, chat }, signal) => {
      const { analytics } = await resources.plugins.core.start();

      async function getContext() {
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
          learnings: [],
          ...(dataWithinTokenLimit.length ? { data_on_screen: dataWithinTokenLimit } : {}),
        };

        if (!isKnowledgeBaseReady) {
          return { content };
        }

        const userMessage = last(
          messages.filter((message) => message.message.role === MessageRole.User)
        );

        const userPrompt = userMessage?.message.content!;

        const { scores, relevantDocuments, suggestions } = await recallAndScore({
          recall: client.recall,
          chat,
          logger: resources.logger,
          userPrompt,
          context: screenDescription,
          messages,
          signal,
          analytics,
        });

        return {
          content: { ...content, learnings: relevantDocuments as unknown as Serializable },
          data: {
            scores,
            suggestions,
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
