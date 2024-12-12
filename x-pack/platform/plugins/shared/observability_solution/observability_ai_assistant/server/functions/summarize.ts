/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { FunctionRegistrationParameters } from '.';
import { KnowledgeBaseEntryRole } from '../../common';

export const SUMMARIZE_FUNCTION_NAME = 'summarize';

export function registerSummarizationFunction({
  client,
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: SUMMARIZE_FUNCTION_NAME,
      description: `Use this function to store facts in the knowledge database if the user requests it.
        You can score the learnings with a confidence metric, whether it is a correction on a previous learning.
        An embedding will be created that you can recall later with a semantic search.
        When you create this summarisation, make sure you craft it in a way that can be recalled with a semantic
        search later, and that it would have answered the user's original request.`,
      descriptionForUser:
        'This function allows the Elastic Assistant to summarize things from the conversation.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description:
              'A human readable title that can be used to identify the document later. This should be no longer than 255 characters',
          },
          text: {
            type: 'string',
            description:
              "A human-readable summary of what you have learned, described in such a way that you can recall it later with semantic search, and that it would have answered the user's original request.",
          },
          is_correction: {
            type: 'boolean',
            description: 'Whether this is a correction for a previous learning.',
          },
          confidence: {
            type: 'string',
            description: 'How confident you are about this being a correct and useful learning',
            enum: ['low' as const, 'medium' as const, 'high' as const],
          },
          public: {
            type: 'boolean',
            description:
              'Whether this information is specific to the user, or generally applicable to any user of the product',
          },
        },
        required: [
          'title' as const,
          'text' as const,
          'is_correction' as const,
          'confidence' as const,
          'public' as const,
        ],
      },
    },
    async (
      { arguments: { title, text, is_correction: isCorrection, confidence, public: isPublic } },
      signal
    ) => {
      const id = v4();
      resources.logger.debug(`Creating new knowledge base entry with id: ${id}`);

      return client
        .addKnowledgeBaseEntry({
          entry: {
            id,
            title,
            text,
            public: isPublic,
            role: KnowledgeBaseEntryRole.AssistantSummarization,
            confidence,
            is_correction: isCorrection,
            labels: {},
          },
          // signal,
        })
        .then(() => ({
          content: {
            message: `The document has been stored`,
          },
        }));
    }
  );
}
