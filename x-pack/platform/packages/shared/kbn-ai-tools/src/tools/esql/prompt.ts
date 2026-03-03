/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt_template.text';
import contentPromptTemplate from './content_prompt_template.text';

export const EsqlPrompt = createPrompt({
  name: 'esql_prompt',
  description: 'Answer ES|QL related questions',
  input: z.object({
    prompt: z.string(),
    esql_system_prompt: z.string(),
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
        template: contentPromptTemplate,
      },
    },
    temperature: 0.25,
    tools: {
      get_documentation: {
        description: 'Get documentation about specific ES|QL commands or functions',
        schema: {
          type: 'object',
          properties: {
            commands: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            functions: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['commands', 'functions'],
        },
      },
      validate_queries: {
        description: 'Validate one or more ES|QL queries for syntax errors and/or mapping issues',
        schema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['queries'],
        },
      },
      run_queries: {
        description: 'Run one or more validated ES|QL queries and retrieve the results',
        schema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['queries'],
        },
      },
      list_datasets: {
        description:
          'List datasets (index, data stream, aliases) based on a name or pattern, similar to _resolve/_index',
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['name'],
        },
      },
      describe_dataset: {
        description: `Get dataset description via sampling of documents`,
        schema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index, data stream or index pattern you want to analyze',
            },
            kql: {
              type: 'string',
              description: 'KQL for filtering the data',
            },
          },
          required: ['index'],
        },
      },
    } as const,
  })
  .get();
