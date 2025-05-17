/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ModelFamily, ModelProvider, PromptVersion, createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt_template.md';
import contentPromptTemplate from './content_prompt_template.md';

const baseVersion = {
  system: {
    mustache: {
      template: systemPromptTemplate,
    },
  },
  template: {
    mustache: {
      template: contentPromptTemplate,
    },
  },
  tools: {
    suggest_panels: {
      description: `Suggest panels to be visualized`,
      schema: {
        type: 'object',
        properties: {
          panels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                },
                title: {
                  type: 'string',
                },
                description: {
                  type: 'string',
                },
                query: {
                  type: 'string',
                },
                visualization: {
                  type: 'string',
                },
              },
              required: ['id', 'title', 'description', 'query', 'visualization'],
            },
          },
        },
        required: ['panels'],
      },
    } as const,
  },
} satisfies PromptVersion;

export const GeneratePanels = createPrompt({
  name: 'generate_panels_prompt',
  description: 'Generate panels based on data in a stream',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    dataset_analysis: z.string(),
    sample_documents: z.string(),
  }),
})
  .version(baseVersion)
  .version({
    ...baseVersion,
    models: [
      {
        provider: ModelProvider.Google,
        family: ModelFamily.Gemini,
        id: 'gemini-2.5-flash',
      },
    ],
    invokeParameters: {
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    },
  })
  .get();
