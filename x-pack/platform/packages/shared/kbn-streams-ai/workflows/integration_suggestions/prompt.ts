/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt.text';
import taskDescriptionTemplate from './task_description.text';

export const IntegrationSuggestionsPrompt = createPrompt({
  name: 'integration_suggestions_prompt',
  description: 'Suggest Fleet integrations based on detected stream features',
  input: z.object({
    stream_name: z.string(),
    features_json: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: taskDescriptionTemplate,
      },
    },
    tools: {
      search_integrations: {
        description:
          'Search available Fleet integration packages. Use with a search term to find specific integrations, or leave searchTerm empty to list all available packages.',
        schema: {
          type: 'object',
          properties: {
            searchTerm: {
              type: 'string',
              description:
                'Optional search term to filter packages (e.g., "nginx", "mysql"). Leave empty to list all packages.',
            },
          },
        },
      } as const,
      finalize_suggestions: {
        description:
          'Submit final integration suggestions. Call this when you have analyzed the features and found matching integrations.',
        schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              description: 'List of suggested integrations',
              items: {
                type: 'object',
                properties: {
                  packageName: {
                    type: 'string',
                    description: 'The Fleet package name (e.g., "nginx_otel", "mysql")',
                  },
                  featureId: {
                    type: 'string',
                    description: 'The ID of the feature this integration matches',
                  },
                  reason: {
                    type: 'string',
                    description: 'Brief explanation of why this integration is recommended',
                  },
                },
                required: ['packageName', 'featureId', 'reason'],
              },
            },
          },
          required: ['suggestions'],
        },
      } as const,
    },
  })
  .get();

export interface IntegrationSuggestionFromAI {
  packageName: string;
  featureId: string;
  reason: string;
}
