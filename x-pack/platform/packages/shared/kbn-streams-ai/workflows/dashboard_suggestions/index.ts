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
import { EsqlDocumentBase } from '@kbn/inference-plugin/server';
import { once } from 'lodash';
import type {
  RawDashboard,
  DashboardPanel,
  ColumnMetadata,
  DashboardSuggestionResult,
} from '@kbn/streams-schema';
import { SuggestDashboardPrompt } from './prompt';
import { dashboardSchema } from './schema';
import type { DashboardSuggestionInput, DashboardSuggestionEngineOptions } from './types';

// Re-export types from kbn-streams-schema (canonical source)
export type {
  DashboardSuggestionResult,
  DashboardSuggestionTaskResult,
  DashboardSuggestionInputType,
  RawDashboard,
  DashboardPanel,
  ColumnMetadata,
  PanelDimensions,
  PanelPosition,
  PanelType,
  TimeRange,
  DashboardFilter,
} from '@kbn/streams-schema';

// Export types defined locally in this package
export type { DashboardSuggestionInput, DashboardSuggestionEngineOptions } from './types';

export {
  prepareDashboardSuggestionInput,
  getInputTypeFromDefinition,
  isQueryStreamDefinition,
  isIngestStreamDefinition,
  type PrepareDashboardSuggestionInputOptions,
} from './prepare_input';

const loadEsqlDocBase = once(() => EsqlDocumentBase.load());

/**
 * Normalizes ES types to Kibana types for column metadata.
 */
function normalizeEsType(esType: string): string {
  if (esType === 'boolean') {
    return 'boolean';
  }
  if (esType === 'text' || esType === 'keyword') {
    return 'string';
  }
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
  if (esType === 'date' || esType === 'date_nanos') {
    return 'date';
  }
  return esType;
}

/**
 * Validates a dashboard panel structure.
 */
function validatePanelStructure(panel: unknown): panel is DashboardPanel {
  if (!panel || typeof panel !== 'object') return false;
  const p = panel as Record<string, unknown>;
  return Boolean(
    p.id &&
      p.title &&
      p.type &&
      p.query &&
      p.position &&
      p.dimensions &&
      typeof p.position === 'object'
  );
}

/**
 * Validates dashboard structure.
 */
function validateDashboardStructure(
  dashboard: unknown
): dashboard is { title: string; panels: unknown[] } {
  if (!dashboard || typeof dashboard !== 'object') return false;
  const d = dashboard as Record<string, unknown>;
  return Boolean(d.title && Array.isArray(d.panels));
}

/**
 * Generates dashboard suggestions for a stream using an AI reasoning agent.
 *
 * Supports both ingest streams (index-backed) and query streams (ES|QL view-backed).
 * The engine validates all panel queries against the actual data and extracts
 * column metadata for proper visualization mapping.
 *
 * @param input - Dashboard suggestion input configuration
 * @param inferenceClient - Bound inference client for LLM calls
 * @param esClient - Elasticsearch client for query execution
 * @param logger - Logger instance
 * @param signal - Abort signal for cancellation
 * @param options - Optional configuration
 * @returns Dashboard suggestion result with raw dashboard or error
 */
export async function suggestDashboard({
  input,
  inferenceClient,
  esClient,
  logger,
  signal,
  options = {},
}: {
  input: DashboardSuggestionInput;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  options?: DashboardSuggestionEngineOptions;
}): Promise<DashboardSuggestionResult> {
  const {
    streamName,
    inputType,
    definition,
    esqlQuery,
    esqlViewName,
    features,
    guidance,
    previousDashboard,
  } = input;
  const { maxSteps } = options;
  const warnings: string[] = [];

  try {
    const docBase = await loadEsqlDocBase();
    let lastDashboard: RawDashboard | null = null;

    // Build prompt input based on input type
    const promptInput = {
      stream_name: streamName,
      input_type: inputType,
      stream_definition: definition ? JSON.stringify(definition) : undefined,
      esql_query: esqlQuery,
      esql_view_name: esqlViewName,
      features_as_string: JSON.stringify(features),
      dashboard_schema: JSON.stringify(dashboardSchema),
      guidance,
      previous_dashboard: previousDashboard ? JSON.stringify(previousDashboard) : undefined,
    };

    await executeAsReasoningAgent({
      inferenceClient,
      prompt: SuggestDashboardPrompt,
      input: promptInput,
      maxSteps,
      toolCallbacks: {
        get_documentation: async (toolCall) => {
          const args = toolCall.function.arguments;
          logger.debug(`[get_documentation] Arguments: ${JSON.stringify(args)}`);

          const docResponse = docBase.getDocumentation(args.commands.concat(args.functions), {
            generateMissingKeywordDoc: true,
          });

          logger.debug(`[get_documentation] Response: ${JSON.stringify(docResponse)}`);
          return { response: docResponse };
        },

        probe_data: async (toolCall) => {
          try {
            const { query } = toolCall.function.arguments;
            logger.debug(`[probe_data] Query: ${query}`);

            const esqlResponse = await esClient.esql.query({
              query,
              format: 'json',
            });

            const responseData = {
              columns: esqlResponse.columns,
              values: esqlResponse.values,
              total_rows: esqlResponse.values?.length || 0,
            };

            logger.debug(`[probe_data] Response rows: ${responseData.total_rows}`);
            return { response: responseData };
          } catch (error) {
            logger.error(`Error executing ES|QL query: ${error}`);
            const errorResponse = {
              error: error instanceof Error ? error.message : 'Unknown error',
              columns: [],
              values: [],
              total_rows: 0,
            };
            return { response: errorResponse };
          }
        },

        generate_dashboard: async (toolCall) => {
          try {
            const { dashboard } = toolCall.function.arguments;
            logger.debug(`[generate_dashboard] Dashboard: ${JSON.stringify(dashboard)}`);

            // Validate dashboard structure
            if (!validateDashboardStructure(dashboard)) {
              return {
                response: {
                  success: false,
                  error: 'Invalid dashboard structure: missing title or panels array',
                },
              };
            }

            // Validate each panel
            for (const panel of dashboard.panels) {
              if (!validatePanelStructure(panel)) {
                const panelId =
                  panel && typeof panel === 'object' ? (panel as { id?: unknown }).id : 'unknown';
                return {
                  response: {
                    success: false,
                    error: `Invalid panel structure for panel: ${
                      panelId || 'unknown'
                    }. Each panel must have id, title, type, query, position, and dimensions.`,
                  },
                };
              }
            }

            // Validate panel queries by executing them in parallel
            const validationResults = await Promise.all(
              (dashboard.panels as DashboardPanel[]).map(async (panel) => {
                try {
                  // Try to correct common ES|QL mistakes before executing
                  const { output: correctedQuery, isCorrection } = correctCommonEsqlMistakes(
                    panel.query
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
                    columns: esqlResponse.columns,
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
              return {
                response: {
                  success: false,
                  error: `Query validation failed for ${
                    queryValidationErrors.length
                  } panel(s):\n${queryValidationErrors.join('\n')}`,
                },
              };
            }

            // Apply corrected queries to dashboard panels
            const correctedPanels = (dashboard.panels as DashboardPanel[]).map((panel, index) => {
              const validationResult = validationResults[index];
              if (validationResult.correctedQuery) {
                if (!warnings.includes(`Query corrected for panel: ${panel.id}`)) {
                  warnings.push(`Query corrected for panel: ${panel.id}`);
                }
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
            } as RawDashboard;

            // Store the dashboard
            lastDashboard = finalDashboard;

            return {
              response: {
                success: true,
                dashboard: finalDashboard,
                panel_count: finalDashboard.panels.length,
              },
            };
          } catch (error) {
            logger.error(`Error generating dashboard: ${error}`);
            return {
              response: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            };
          }
        },

        commit_dashboard: async (toolCall) => {
          const args = toolCall.function.arguments;
          logger.debug(`[commit_dashboard] Message: ${args.message}`);

          return {
            response: {
              success: true,
              message: args.message || 'Dashboard committed successfully',
            },
          };
        },
      },
      finalToolChoice: {
        type: 'function',
        function: 'commit_dashboard',
      },
      abortSignal: signal,
    });

    // No dashboard generated
    if (!lastDashboard) {
      logger.warn('No dashboard generated from workflow');
      return {
        streamName,
        inputType,
        dashboardSuggestion: undefined,
        warnings,
        error: 'No dashboard was generated from the workflow',
      };
    }

    // Extract column metadata for each panel
    // Type assertion is safe here as we've validated lastDashboard is not null above
    const validatedDashboard = lastDashboard as RawDashboard;
    logger.debug('[Extracting column metadata for panels]');
    const panelsWithMetadata = await Promise.all(
      validatedDashboard.panels.map(async (panel: DashboardPanel) => {
        try {
          const esqlResponse = await esClient.esql.query({
            query: panel.query,
            format: 'json',
          });

          const columnMetadata: ColumnMetadata[] | undefined = esqlResponse.columns?.map((col) => {
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
          logger.error(`Error extracting column metadata for panel ${panel.id}: ${error}`);
          warnings.push(`Failed to extract column metadata for panel: ${panel.id}`);
          return panel;
        }
      })
    );

    const finalDashboard: RawDashboard = {
      ...validatedDashboard,
      panels: panelsWithMetadata,
    };

    logger.debug(`[Final Dashboard]: ${JSON.stringify(finalDashboard)}`);

    return {
      streamName,
      inputType,
      dashboardSuggestion: {
        rawDashboard: finalDashboard,
      },
      warnings,
    };
  } catch (error) {
    logger.error(`Error in dashboard suggestion workflow: ${error}`);
    return {
      streamName,
      inputType,
      dashboardSuggestion: undefined,
      warnings,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
