/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Feature, Streams } from '@kbn/streams-schema';
import { SuggestStreamDashboardPrompt } from './prompt';
import { schema } from './schema';

interface Dashboard {
  title: string;
  description?: string;
  panels: Array<{
    id: string;
    title: string;
    description?: string;
    type: string;
    query: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config?: Record<string, any>;
  }>;
  timeRange: {
    from: string;
    to: string;
  };
  refreshInterval?: string;
  filters?: Array<{
    field: string;
    label: string;
    type: string;
    options?: string[];
  }>;
  tags?: string[];
}

export async function suggestStreamDashboard({
  definition,
  features,
  inferenceClient,
  esClient,
  logger,
  maxSteps,
  signal,
}: {
  definition: Streams.ingest.all.Definition;
  features: Feature[];
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  maxSteps?: number | undefined;
  signal: AbortSignal;
}): Promise<Dashboard | null> {
  try {
    const response = await executeAsReasoningAgent({
      inferenceClient,
      prompt: SuggestStreamDashboardPrompt,
      input: {
        stream: definition,
        stream_as_string: JSON.stringify(definition),
        features_as_string: JSON.stringify(features),
        dashboard_schema: JSON.stringify(schema),
      },
      maxSteps,
      toolCallbacks: {
        probe_data: async (toolCall) => {
          try {
            const { query } = toolCall.function.arguments;

            // Execute ESQL query
            const esqlResponse = await esClient.esql.query({
              query,
              format: 'json',
            });

            return {
              response: {
                columns: esqlResponse.columns,
                values: esqlResponse.values,
                total_rows: esqlResponse.values?.length || 0,
              },
            };
          } catch (error) {
            logger.error('Error executing ESQL query', error);
            return {
              response: {
                error: error instanceof Error ? error.message : 'Unknown error',
                columns: [],
                values: [],
                total_rows: 0,
              },
            };
          }
        },
        generate_dashboard: async (toolCall) => {
          try {
            const { dashboard } = toolCall.function.arguments;

            // Validate dashboard structure
            if (
              !dashboard ||
              !dashboard.title ||
              !dashboard.panels ||
              !Array.isArray(dashboard.panels)
            ) {
              return {
                response: {
                  success: false,
                  error: 'Invalid dashboard structure',
                },
              };
            }

            // Basic validation of panels
            for (const panel of dashboard.panels) {
              if (!panel.id || !panel.title || !panel.type || !panel.query || !panel.position) {
                return {
                  response: {
                    success: false,
                    error: `Invalid panel structure for panel: ${panel.id || 'unknown'}`,
                  },
                };
              }
            }

            return {
              response: {
                success: true,
                dashboard,
                panel_count: dashboard.panels.length,
              },
            };
          } catch (error) {
            logger.error('Error generating dashboard', error);
            return {
              response: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            };
          }
        },
      },
      finalToolChoice: {
        type: 'function',
        function: 'generate_dashboard',
      },
      abortSignal: signal,
    });

    // Extract the final dashboard from the response
    const finalDashboard = response?.toolCalls
      ?.filter((toolCall) => toolCall.function.name === 'generate_dashboard')
      ?.pop()?.function.arguments.dashboard;

    if (!finalDashboard) {
      logger.warn('No dashboard generated from workflow');
      return null;
    }

    return finalDashboard as Dashboard;
  } catch (error) {
    logger.error('Error in dashboard suggestion workflow', error);
    return null;
  }
}
