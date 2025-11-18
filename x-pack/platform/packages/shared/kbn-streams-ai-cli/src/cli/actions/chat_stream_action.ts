/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAsEsqlAgent } from '@kbn/ai-tools';
import type { PromptResponse } from '@kbn/inference-common';
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { StreamAction } from '../types';
import { promptInput, BACK_OPTION_VALUE } from '../prompt/prompt';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatStreamAction: StreamAction = {
  id: 'chatStream',
  label: 'Chat (ESQL)',
  description: 'Interact with an ESQL reasoning agent for this stream.',
  run: async ({ esClient, inferenceClient, logger, signal, start, end, stream }) => {
    const history: ChatMessage[] = [];
    logger.info('Entering chat. Type /back to exit, /clear to reset history.');

    while (!signal.aborted) {
      const input = await promptInput({
        message: 'chat> ',
        allowEmpty: false,
      });

      if (input === BACK_OPTION_VALUE || input === '/back' || input === '/quit') {
        break;
      }
      if (input === '/clear') {
        history.length = 0;
        logger.info('History cleared.');
        continue;
      }

      history.push({ role: 'user', content: input });

      try {
        const response: PromptResponse = await withActiveInferenceSpan(
          'Answer',
          { root: true },
          () =>
            executeAsEsqlAgent({
              inferenceClient,
              esClient,
              start,
              end,
              signal,
              prompt: `Based on the data in the stream \`${stream.name}\`, answer the following question directly to the user:
          
          ${input}`,
              logger,
            })
        );

        const content = serializePromptResponse(response);
        logger.info(content);
        history.push({ role: 'assistant', content });

        // wait on additional logs
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 1500);
        });
      } catch (error) {
        logger.error(`Chat error: ${(error as Error).message}`);
      }
    }

    return {
      label: 'Chat session ended',
      description: `Messages exchanged: ${history.length}`,
      body: history,
    };
  },
};

function serializePromptResponse(response: PromptResponse): string {
  return response.content;
}
