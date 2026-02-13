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

export const SuggestDashboardPrompt = createPrompt({
  name: 'suggest_dashboard_prompt',
  description: 'Suggest dashboard configuration based on stream data analysis',
  input: z.object({
    stream_name: z.string(),
    input_type: z.enum(['ingest', 'query']),
    // For ingest streams
    stream_definition: z.string().optional(),
    // For query streams
    esql_query: z.string().optional(),
    esql_view_name: z.string().optional(),
    features_as_string: z.string(),
    dashboard_schema: z.string(),
    guidance: z.string().optional(),
    previous_dashboard: z.string().optional(),
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
              description: 'ES|QL commands to get documentation for',
            },
            functions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'ES|QL functions to get documentation for',
            },
          },
          required: ['commands', 'functions'],
        },
      } as const,
      probe_data: {
        description:
          'Execute ES|QL queries to explore and analyze the data stream structure and content. Always close with a LIMIT 10 to keep it quick.',
        schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'ES|QL query to execute for data exploration.',
            },
          },
          required: ['query'],
        },
      } as const,
      generate_dashboard: {
        description:
          'Generate and validate a dashboard definition based on the data analysis. This tool will validate all panel queries. If validation succeeds, proceed to commit_dashboard.',
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
                description: {
                  type: 'string',
                  description: 'Description of what the dashboard shows',
                },
                panels: {
                  type: 'array',
                  description: 'Array of visualization panels in the dashboard',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Panel identifier' },
                      title: { type: 'string', description: 'Panel title' },
                      description: { type: 'string', description: 'Panel description' },
                      type: {
                        type: 'string',
                        description:
                          'Type of visualization: line_chart, area_chart, bar_chart, pie_chart, data_table',
                      },
                      query: { type: 'string', description: 'ES|QL query for the panel' },
                      dimensions: {
                        type: 'object',
                        description:
                          'Mapping of query result columns to visual dimensions. For bar/line/area charts: x (dimension) and y (metric). For pie charts: partition (dimension) and value (metric). For data tables: columns (array of column names).',
                        properties: {
                          x: {
                            type: 'string',
                            description: 'Column name for X axis (bar/line/area charts)',
                          },
                          y: {
                            type: 'string',
                            description: 'Column name for Y axis/metric (bar/line/area charts)',
                          },
                          partition: {
                            type: 'string',
                            description: 'Column name for partitions (pie chart)',
                          },
                          value: {
                            type: 'string',
                            description: 'Column name for values/metric (pie chart)',
                          },
                          columns: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Column names to display (data table)',
                          },
                        },
                      },
                      position: {
                        type: 'object',
                        description:
                          'Panel position and size in grid units. Grid width is 48 units total (x: 0-47). Common widths: 48 (full), 24 (half), 16 (third), 12 (quarter).',
                        properties: {
                          x: {
                            type: 'number',
                            description: 'X position in grid columns (0-47, grid width is 48)',
                          },
                          y: {
                            type: 'number',
                            description: 'Y position in grid rows',
                          },
                          width: {
                            type: 'number',
                            description: 'Panel width in grid units (max 48)',
                          },
                          height: {
                            type: 'number',
                            description: 'Panel height in grid units',
                          },
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
                timeRange: {
                  type: 'object',
                  description: 'Default time range for the dashboard',
                  properties: {
                    from: { type: 'string', description: 'Start time' },
                    to: { type: 'string', description: 'End time' },
                  },
                },
                refreshInterval: {
                  type: 'string',
                  description: 'How often to refresh data',
                },
                filters: {
                  type: 'array',
                  description: 'Global filters for the dashboard',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      label: { type: 'string' },
                      type: { type: 'string' },
                      options: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to categorize the dashboard',
                },
              },
            },
          },
          required: ['dashboard'],
        },
      } as const,
      commit_dashboard: {
        description:
          'Commit the validated dashboard as the final result. Call this after generate_dashboard succeeds to complete the workflow.',
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Optional commit message summarizing the dashboard',
            },
          },
        },
      } as const,
    },
  })
  .get();
