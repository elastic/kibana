/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common/tasks/nl_to_esql';
import type { Feature, Streams } from '@kbn/streams-schema';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server';
import { once } from 'lodash';
import { SuggestStreamDashboardPrompt } from './prompt';
import { schema } from './schema';

const loadEsqlDocBase = once(() => EsqlDocumentBase.load());

interface Dashboard {
  title: string;
  description?: string;
  panels: Array<{
    id: string;
    title: string;
    description?: string;
    type: string;
    query: string;
    dimensions?: {
      x?: string;
      y?: string;
      partition?: string;
      value?: string;
      columns?: string[];
    };
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config?: Record<string, any>;
    columnMetadata?: Array<{
      columnId: string;
      fieldName: string;
      label: string;
      customLabel: boolean;
      meta: {
        type: string;
        esType?: string;
      };
      inMetricDimension?: boolean;
    }>;
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
    const docBase = await loadEsqlDocBase();
    let lastDashboard: Dashboard | null = null;

    await executeAsReasoningAgent({
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
        get_documentation: async (toolCall) => {
          const args = toolCall.function.arguments;
          // eslint-disable-next-line no-console
          console.log('[get_documentation] Arguments:', JSON.stringify(args, null, 2));

          const docResponse = docBase.getDocumentation(args.commands.concat(args.functions), {
            generateMissingKeywordDoc: true,
          });

          // eslint-disable-next-line no-console
          console.log('[get_documentation] Response:', JSON.stringify(docResponse, null, 2));

          return { response: docResponse };
        },
        probe_data: async (toolCall) => {
          try {
            const { query } = toolCall.function.arguments;
            // eslint-disable-next-line no-console
            console.log('[probe_data] Arguments:', JSON.stringify({ query }, null, 2));

            // Execute ESQL query
            const esqlResponse = await esClient.esql.query({
              query,
              format: 'json',
            });

            const responseData = {
              columns: esqlResponse.columns,
              values: esqlResponse.values,
              total_rows: esqlResponse.values?.length || 0,
            };

            // eslint-disable-next-line no-console
            console.log('[probe_data] Response:', JSON.stringify(responseData, null, 2));

            return {
              response: responseData,
            };
          } catch (error) {
            logger.error('Error executing ESQL query', error);
            const errorResponse = {
              error: error instanceof Error ? error.message : 'Unknown error',
              columns: [],
              values: [],
              total_rows: 0,
            };

            // eslint-disable-next-line no-console
            console.log('[probe_data] Error response:', JSON.stringify(errorResponse, null, 2));

            return {
              response: errorResponse,
            };
          }
        },
        generate_dashboard: async (toolCall) => {
          try {
            const { dashboard } = toolCall.function.arguments;
            // eslint-disable-next-line no-console
            console.log('[generate_dashboard] Arguments:', JSON.stringify({ dashboard }, null, 2));

            // Validate dashboard structure
            if (
              !dashboard ||
              !dashboard.title ||
              !dashboard.panels ||
              !Array.isArray(dashboard.panels)
            ) {
              const errorResponse = {
                success: false,
                error: 'Invalid dashboard structure',
              };

              // eslint-disable-next-line no-console
              console.log('[generate_dashboard] Response:', JSON.stringify(errorResponse, null, 2));

              return {
                response: errorResponse,
              };
            }

            // Basic validation of panels
            for (const panel of dashboard.panels) {
              if (
                !panel.id ||
                !panel.title ||
                !panel.type ||
                !panel.query ||
                !panel.position ||
                !panel.dimensions
              ) {
                return {
                  response: {
                    success: false,
                    error: `Invalid panel structure for panel: ${panel.id || 'unknown'}`,
                  },
                };
              }
            }

            // Validate panel queries by executing them in parallel (similar to probe_data)
            const validationResults = await Promise.all(
              dashboard.panels.map(async (panel) => {
                try {
                  // Try to correct common ESQL mistakes before executing
                  const { output: correctedQuery, isCorrection } = correctCommonEsqlMistakes(
                    panel.query!
                  );

                  // Execute the corrected query
                  const esqlResponse = await esClient.esql.query({
                    query: correctedQuery,
                    format: 'json',
                  });

                  // Validate that query returned results
                  if (!esqlResponse.values || esqlResponse.values.length === 0) {
                    return {
                      success: false,
                      panel,
                      correctedQuery: undefined,
                      error: `Panel "${panel.title}" (${panel.id}): Query returned no results`,
                    };
                  }

                  // Validate that required dimensions exist in the result columns
                  const columnNames = esqlResponse.columns?.map((col) => col.name) || [];
                  const missingDimensions: string[] = [];

                  if (
                    panel.type === 'line_chart' ||
                    panel.type === 'area_chart' ||
                    panel.type === 'bar_chart'
                  ) {
                    if (panel.dimensions?.x && !columnNames.includes(panel.dimensions.x)) {
                      missingDimensions.push(`x dimension: ${panel.dimensions.x}`);
                    }
                    if (panel.dimensions?.y && !columnNames.includes(panel.dimensions.y)) {
                      missingDimensions.push(`y dimension: ${panel.dimensions.y}`);
                    }
                  } else if (panel.type === 'pie_chart') {
                    if (
                      panel.dimensions?.partition &&
                      !columnNames.includes(panel.dimensions.partition)
                    ) {
                      missingDimensions.push(`partition dimension: ${panel.dimensions.partition}`);
                    }
                    if (panel.dimensions?.value && !columnNames.includes(panel.dimensions.value)) {
                      missingDimensions.push(`value dimension: ${panel.dimensions.value}`);
                    }
                  } else if (panel.type === 'data_table') {
                    if (panel.dimensions?.columns) {
                      for (const col of panel.dimensions.columns) {
                        if (!columnNames.includes(col)) {
                          missingDimensions.push(`column: ${col}`);
                        }
                      }
                    }
                  }

                  if (missingDimensions.length > 0) {
                    return {
                      success: false,
                      panel,
                      correctedQuery: undefined,
                      error: `Panel "${panel.title}" (${
                        panel.id
                      }): Missing columns in query result: ${missingDimensions.join(
                        ', '
                      )}. Available columns: ${columnNames.join(', ')}`,
                    };
                  }

                  return {
                    success: true,
                    panel,
                    correctedQuery: isCorrection ? correctedQuery : undefined,
                  };
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                  return {
                    success: false,
                    panel,
                    correctedQuery: undefined,
                    error: `Panel "${panel.title}" (${panel.id}): ${errorMessage}`,
                  };
                }
              })
            );

            // Collect errors from failed validations
            const queryValidationErrors = validationResults
              .filter((result) => !result.success)
              .map((result) => result.error!);

            // If any queries failed, return error with details
            if (queryValidationErrors.length > 0) {
              const errorResponse = {
                success: false,
                error: `Query validation failed for ${
                  queryValidationErrors.length
                } panel(s):\n${queryValidationErrors.join('\n')}`,
              };

              // eslint-disable-next-line no-console
              console.log('[generate_dashboard] Response:', JSON.stringify(errorResponse, null, 2));

              return {
                response: errorResponse,
              };
            }

            // Apply corrected queries to dashboard panels
            const correctedPanels = dashboard.panels.map((panel, index) => {
              const validationResult = validationResults[index];
              if (validationResult.correctedQuery) {
                return {
                  ...panel,
                  query: validationResult.correctedQuery,
                };
              }
              return panel;
            });

            const finalDashboard = {
              ...dashboard,
              panels: correctedPanels,
            };

            // Store the dashboard in the outer scope variable
            lastDashboard = finalDashboard as Dashboard;

            const successResponse = {
              success: true,
              dashboard: finalDashboard,
              panel_count: finalDashboard.panels.length,
            };

            // eslint-disable-next-line no-console
            console.log('[generate_dashboard] Response:', JSON.stringify(successResponse, null, 2));

            return {
              response: successResponse,
            };
          } catch (error) {
            logger.error('Error generating dashboard', error);
            const errorResponse = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };

            // eslint-disable-next-line no-console
            console.log('[generate_dashboard] Response:', JSON.stringify(errorResponse, null, 2));

            return {
              response: errorResponse,
            };
          }
        },
        commit_dashboard: async (toolCall) => {
          const args = toolCall.function.arguments;
          // eslint-disable-next-line no-console
          console.log('[commit_dashboard] Arguments:', JSON.stringify(args, null, 2));

          const commitResponse = {
            success: true,
            message: args.message || 'Dashboard committed successfully',
          };

          // eslint-disable-next-line no-console
          console.log('[commit_dashboard] Response:', JSON.stringify(commitResponse, null, 2));

          return { response: commitResponse };
        },
      },
      finalToolChoice: {
        type: 'function',
        function: 'commit_dashboard',
      },
      abortSignal: signal,
    });

    // Return the dashboard stored by generate_dashboard callback
    if (!lastDashboard) {
      logger.warn('No dashboard generated from workflow');
      return null;
    }

    // Extract column metadata from each panel's query
    // eslint-disable-next-line no-console
    console.log('[Extracting column metadata for panels]');

    // Store reference with narrowed type
    const validatedDashboard: Dashboard = lastDashboard;

    // Helper function to normalize ES types to Kibana types
    const normalizeEsType = (esType: string): string => {
      // Boolean stays as is
      if (esType === 'boolean') {
        return 'boolean';
      }
      // Text/keyword become string
      if (esType === 'text' || esType === 'keyword') {
        return 'string';
      }
      // Numeric types become number
      if (
        esType === 'long' ||
        esType === 'integer' ||
        esType === 'short' ||
        esType === 'byte' ||
        esType === 'double' ||
        esType === 'float' ||
        esType === 'half_float' ||
        esType === 'scaled_float'
      ) {
        return 'number';
      }
      // Date types
      if (esType === 'date' || esType === 'date_nanos') {
        return 'date';
      }
      // Default to the original type for other cases
      return esType;
    };

    const panelsWithMetadata = await Promise.all(
      validatedDashboard.panels.map(async (panel) => {
        try {
          const esqlResponse = await esClient.esql.query({
            query: panel.query,
            format: 'json',
          });

          const columnMetadata = esqlResponse.columns?.map((col) => {
            // Determine if this column is used as a metric dimension
            const isMetric =
              panel.dimensions?.y === col.name || panel.dimensions?.value === col.name;

            return {
              columnId: col.name,
              fieldName: col.name,
              label: col.name,
              customLabel: false,
              meta: {
                type: normalizeEsType(col.type),
                esType: col.type,
              },
              ...(isMetric ? { inMetricDimension: true } : {}),
            };
          });

          return {
            ...panel,
            columnMetadata,
          };
        } catch (error) {
          logger.error(`Error extracting column metadata for panel ${panel.id}`, error);
          return panel;
        }
      })
    );

    const finalDashboard: Dashboard = {
      ...validatedDashboard,
      panels: panelsWithMetadata,
    };

    // eslint-disable-next-line no-console
    console.log('[Final Dashboard with metadata]:', JSON.stringify(finalDashboard, null, 2));

    return finalDashboard;
  } catch (error) {
    logger.error('Error in dashboard suggestion workflow', error);
    return null;
  }
}
