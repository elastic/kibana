/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import systemPromptTemplate from './system_prompt.text';
import contentPromptTemplate from './task_description.text';

export const SuggestStreamDashboardPrompt = createPrompt({
  name: 'suggest_stream_dashboard_prompt',
  description: 'Suggest dashboard configuration based on stream data analysis',
  input: z.object({
    stream: Streams.all.Definition.right,
    stream_as_string: z.string(),
    features_as_string: z.string(),
    dashboard_schema: z.string(),
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
    tools: {
      probe_data: {
        description:
          'Execute ESQL queries to explore and analyze the data stream structure and content.',
        schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'ESQL query to execute for data exploration.',
            },
          },
          required: ['query'],
        },
      } as const,
      generate_dashboard: {
        description: 'Generate and validate a dashboard definition based on the data analysis.',
        schema: {
          type: 'object',
          properties: {
            dashboard: {
              type: 'object',
              description: 'Complete dashboard definition with panels, layout, and configuration.',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the dashboard',
                },
                panels: {
                  type: 'array',
                  description: 'Array of visualization panels in the dashboard',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Panel identifier' },
                      title: { type: 'string', description: 'Panel title' },
                      type: { type: 'string', description: 'Type of visualization' },
                      query: { type: 'string', description: 'ESQL query for the panel' },
                      position: {
                        type: 'object',
                        description: 'Panel position and size',
                        properties: {
                          x: { type: 'number', description: 'X position in grid columns' },
                          y: { type: 'number', description: 'Y position in grid rows' },
                        },
                      },
                      config: {
                        type: 'object',
                        description: 'Panel-specific configuration',
                        properties: {},
                      },
                    },
                  },
                },
                layout: {
                  type: 'object',
                  description: 'Dashboard layout configuration',
                  properties: {},
                },
              },
            },
          },
          required: ['dashboard'],
        },
      } as const,
    },
  })
  .get();
