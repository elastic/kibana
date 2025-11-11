/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';

/**
 * Workflow-specific simplified tools that wrap the original tools
 * and simplify their responses to avoid Elasticsearch mapping issues.
 * These tools are optimized for workflow execution where responses
 * need to be stored in Elasticsearch with text field mappings.
 */

const MAX_ARRAY_SIZE = 5;
const MAX_SLACK_MESSAGES = 50; // Higher limit for Slack messages to ensure correlation works

/**
 * Simplifies tool results by:
 * - Limiting array sizes
 * - Extracting only essential fields
 * - Flattening nested structures
 */
function simplifyToolResult(toolResults: any[]): any {
  const tabular = toolResults.find((r: any) => r.type === ToolResultType.tabularData)?.data;
  const other = toolResults.find((r: any) => r.type === ToolResultType.other)?.data;

  const source = other || tabular;
  if (!source) return null;

  const simplified: any = {};

  // Copy simple scalar fields
  if (source.total !== undefined) simplified.total = source.total;
  if (source.start !== undefined) simplified.start = source.start;
  if (source.end !== undefined) simplified.end = source.end;
  if (source.since !== undefined) simplified.since = source.since;

  // Limit array sizes and extract only essential fields
  // Remove nested arrays (like comments_summary) to keep structure flat
  if (Array.isArray(source.cases) && source.cases.length > 0) {
    simplified.cases = source.cases.slice(0, MAX_ARRAY_SIZE).map((c: any) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      severity: c.severity,
      total_alerts: c.total_alerts,
      url: c.url,
      // Explicitly exclude nested arrays like comments_summary, observables, etc.
    }));
    if (source.cases.length > MAX_ARRAY_SIZE) {
      simplified.cases_truncated = true;
      simplified.total_cases = source.cases.length;
    }
  }

  if (Array.isArray(source.attack_discoveries) && source.attack_discoveries.length > 0) {
    simplified.attack_discoveries = source.attack_discoveries
      .slice(0, MAX_ARRAY_SIZE)
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        url: a.url,
      }));
    if (source.attack_discoveries.length > MAX_ARRAY_SIZE) {
      simplified.attack_discoveries_truncated = true;
      simplified.total_attack_discoveries = source.attack_discoveries.length;
    }
  }

  if (Array.isArray(source.rules) && source.rules.length > 0) {
    simplified.rules = source.rules.slice(0, MAX_ARRAY_SIZE).map((r: any) => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      updated_at: r.updated_at,
      url: r.url,
    }));
    if (source.rules.length > MAX_ARRAY_SIZE) {
      simplified.rules_truncated = true;
      simplified.total_rules = source.rules.length;
    }
  }

  // For detections, keep summary stats only
  if (source.by_severity) {
    simplified.detections_by_severity = source.by_severity;
  }
  if (source.total !== undefined && source.total > 0 && !simplified.total) {
    simplified.detections_total = source.total;
  }
  if (source.alerts_page_url) {
    simplified.alerts_page_url = source.alerts_page_url;
  }

  // For Slack messages, limit arrays but preserve full text for correlation
  // We need the full text to extract URLs for correlation, so don't truncate here
  // Use a higher limit for Slack messages to ensure all messages are available for correlation
  // Truncation can happen later in the summary generator for display purposes
  if (Array.isArray(source.userMentionMessages)) {
    simplified.userMentionMessages = source.userMentionMessages
      .slice(0, MAX_SLACK_MESSAGES)
      .map((m: any) => ({
        text: m.text || m.message, // Preserve full text for correlation
        message: m.message || m.text, // Support both field names
        channel: m.channel,
        permalink: m.permalink,
        timestamp: m.timestamp,
        user: m.user || m.username || m.user_name,
      }));
    if (source.userMentionMessages.length > MAX_SLACK_MESSAGES) {
      simplified.userMentionMessages_truncated = true;
      simplified.total_userMentionMessages = source.userMentionMessages.length;
    }
  }

  if (Array.isArray(source.channelMessages)) {
    simplified.channelMessages = source.channelMessages
      .slice(0, MAX_SLACK_MESSAGES)
      .map((m: any) => ({
        text: m.text || m.message, // Preserve full text for correlation
        message: m.message || m.text, // Support both field names
        channel: m.channel,
        permalink: m.permalink,
        timestamp: m.timestamp,
        user: m.user || m.username || m.user_name,
      }));
    if (source.channelMessages.length > MAX_SLACK_MESSAGES) {
      simplified.channelMessages_truncated = true;
      simplified.total_channelMessages = source.channelMessages.length;
    }
  }

  if (Array.isArray(source.dmMessages)) {
    simplified.dmMessages = source.dmMessages.slice(0, MAX_SLACK_MESSAGES).map((m: any) => ({
      text: m.text || m.message, // Preserve full text for correlation
      message: m.message || m.text, // Support both field names
      user: m.user || m.username || m.user_name,
      permalink: m.permalink,
      timestamp: m.timestamp,
    }));
    if (source.dmMessages.length > MAX_SLACK_MESSAGES) {
      simplified.dmMessages_truncated = true;
      simplified.total_dmMessages = source.dmMessages.length;
    }
  }

  // Copy other simple fields
  if (source.channels_searched !== undefined)
    simplified.channels_searched = source.channels_searched;
  if (source.keywords) simplified.keywords = source.keywords;

  return simplified;
}

/**
 * Generic tool summarizer for workflows
 * Wraps any tool and simplifies its output for safe storage in Elasticsearch
 */
const workflowToolSummarizerSchema = z.object({
  tool_id: z.string().describe('The ID of the tool to execute and summarize'),
  tool_params: z.record(z.unknown()).describe('Parameters to pass to the tool'),
});

export const workflowToolSummarizerTool = (): BuiltinToolDefinition<
  typeof workflowToolSummarizerSchema
> => {
  return {
    id: 'hackathon.catchup.workflow.tool.summarizer',
    type: ToolType.builtin,
    description: `Generic tool summarizer optimized for workflow execution.
    Wraps any tool and simplifies its response to avoid Elasticsearch mapping issues.
    Use this tool in workflows instead of calling tools directly when you need simplified output.`,
    schema: workflowToolSummarizerSchema,
    handler: async ({ tool_id, tool_params }, { runner, logger }) => {
      try {
        // Call the specified tool
        const originalResult = await runner.runTool({
          toolId: tool_id,
          toolParams: tool_params,
        });

        // Check for error results
        const errorResult = originalResult.results.find(
          (r: any) => r.type === ToolResultType.error
        );
        if (errorResult) {
          return {
            results: [errorResult],
          };
        }

        // Extract the original data
        const originalData = originalResult.results[0]?.data;

        // Special handling for security_summary tool which returns nested structure
        let simplifiedData: any = null;
        if (tool_id === 'hackathon.catchup.security.summary' && originalData?.security_summary) {
          const summary = originalData.security_summary;
          simplifiedData = {};

          // Simplify each sub-tool result
          if (summary.attackDiscoveries) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.attackDiscoveries },
            ]);
            if (simplified) {
              simplifiedData.attack_discoveries = simplified;
            } else {
              simplifiedData.attack_discoveries = {
                total: summary.attackDiscoveries.total,
                start: summary.attackDiscoveries.start,
                end: summary.attackDiscoveries.end,
              };
            }
          }

          if (summary.detections) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.detections },
            ]);
            if (simplified) {
              simplifiedData.detections = simplified;
            } else {
              simplifiedData.detections = {
                total: summary.detections.total,
                by_severity: summary.detections.by_severity,
                alerts_page_url: summary.detections.alerts_page_url,
              };
            }
          }

          if (summary.cases) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.cases },
            ]);
            if (simplified) {
              simplifiedData.cases = simplified;
            } else {
              simplifiedData.cases = {
                total: summary.cases.total,
                start: summary.cases.start,
                end: summary.cases.end,
              };
            }
          }

          if (summary.ruleChanges) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.ruleChanges },
            ]);
            if (simplified) {
              simplifiedData.rule_changes = simplified;
            } else {
              simplifiedData.rule_changes = {
                total: summary.ruleChanges.total,
                start: summary.ruleChanges.start,
                end: summary.ruleChanges.end,
              };
            }
          }

          // Add time range if available
          if (tool_params.start) simplifiedData.start = tool_params.start;
          if (tool_params.end) simplifiedData.end = tool_params.end;
        } else {
          // For other tools, use the generic simplifyToolResult function
          const simplified = simplifyToolResult(originalResult.results);
          simplifiedData = simplified;

          // If simplification returned null or empty, try to extract basic data from the original result
          if (!simplifiedData && originalData) {
            if (typeof originalData === 'object' && originalData !== null) {
              simplifiedData = originalData;
            } else {
              simplifiedData = { data: originalData };
            }
          }
        }

        // If we still don't have data, return an empty result
        if (!simplifiedData) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: JSON.stringify({
                  tool_id,
                  message: 'No data returned from tool',
                }),
              },
            ],
          };
        }

        // Return data as JSON string to avoid Elasticsearch mapping issues
        // The workflow execution engine stores the entire response in a text field
        // We stringify the data so it can be stored, but downstream tools will parse it
        return {
          results: [
            {
              type: ToolResultType.other,
              data: JSON.stringify(simplifiedData),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in workflow tool summarizer: ${errorMessage}`);
        return {
          results: [
            createErrorResult(
              `Error executing and summarizing tool ${tool_id}: ${errorMessage}`
            ),
          ],
        };
      }
    },
    tags: ['workflow', 'simplified', 'generic'],
  };
};

/**
 * Simplified security summary tool for workflows
 * Wraps the original tool and simplifies the response
 */
const workflowSecuritySummarySchema = z.object({
  start: z.string().describe('ISO datetime string for the start time'),
  end: z.string().optional().describe('ISO datetime string for the end time (optional)'),
});

export const workflowSecuritySummaryTool = (): BuiltinToolDefinition<
  typeof workflowSecuritySummarySchema
> => {
  return {
    id: 'hackathon.catchup.workflow.security.summary',
    type: ToolType.builtin,
    description: `Simplified security summary tool optimized for workflow execution.
    Wraps the original security summary tool and simplifies responses to avoid storage issues.
    Use this tool in workflows instead of hackathon.catchup.security.summary.`,
    schema: workflowSecuritySummarySchema,
    handler: async ({ start, end }, { runner, logger }) => {
      try {
        // Call the original tool
        const originalResult = await runner.runTool({
          toolId: 'hackathon.catchup.security.summary',
          toolParams: { start, end },
        });

        // Simplify the response
        const simplifiedData: any = {
          start,
          end: end || null,
        };

        // The original tool returns results with nested security_summary
        const originalData = originalResult.results[0]?.data;
        if (originalData?.security_summary) {
          const summary = originalData.security_summary;

          // Simplify each sub-tool result - they come as merged tabular/other results
          // We need to treat them as if they're already in the simplified format
          if (summary.attackDiscoveries) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.attackDiscoveries },
            ]);
            if (simplified) {
              simplifiedData.attack_discoveries = simplified;
            } else {
              // Fallback: extract basic info directly
              simplifiedData.attack_discoveries = {
                total: summary.attackDiscoveries.total,
                start: summary.attackDiscoveries.start,
                end: summary.attackDiscoveries.end,
              };
            }
          }

          if (summary.detections) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.detections },
            ]);
            if (simplified) {
              simplifiedData.detections = simplified;
            } else {
              simplifiedData.detections = {
                total: summary.detections.total,
                by_severity: summary.detections.by_severity,
                alerts_page_url: summary.detections.alerts_page_url,
              };
            }
          }

          if (summary.cases) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.cases },
            ]);
            if (simplified) {
              simplifiedData.cases = simplified;
            } else {
              simplifiedData.cases = {
                total: summary.cases.total,
                start: summary.cases.start,
                end: summary.cases.end,
              };
            }
          }

          if (summary.ruleChanges) {
            const simplified = simplifyToolResult([
              { type: ToolResultType.other, data: summary.ruleChanges },
            ]);
            if (simplified) {
              simplifiedData.rule_changes = simplified;
            } else {
              simplifiedData.rule_changes = {
                total: summary.ruleChanges.total,
                start: summary.ruleChanges.start,
                end: summary.ruleChanges.end,
              };
            }
          }
        }

        // Return data as JSON string to avoid Elasticsearch mapping issues
        // The workflow execution engine stores the entire response in a text field
        // We stringify the data so it can be stored, but downstream tools will parse it
        return {
          results: [
            {
              type: ToolResultType.other,
              data: JSON.stringify(simplifiedData),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in workflow security summary tool: ${errorMessage}`);
        return {
          results: [
            createErrorResult(`Error generating simplified security summary: ${errorMessage}`),
          ],
        };
      }
    },
    tags: ['security', 'workflow', 'simplified'],
  };
};

/**
 * Simplified Slack tool for workflows
 */
const workflowSlackSchema = z.object({
  since: z.string().describe('ISO datetime string for the start time'),
  keywords: z.array(z.string()).optional().describe('Optional keywords to filter messages'),
  includeDMs: z.boolean().optional().describe('Whether to include direct messages'),
});

export const workflowSlackTool = (): BuiltinToolDefinition<typeof workflowSlackSchema> => {
  return {
    id: 'hackathon.catchup.workflow.external.slack',
    type: ToolType.builtin,
    description: `Simplified Slack tool optimized for workflow execution.
    Wraps the original Slack tool and simplifies responses to avoid storage issues.
    Use this tool in workflows instead of hackathon.catchup.external.slack.`,
    schema: workflowSlackSchema,
    handler: async ({ since, keywords, includeDMs }, { runner, logger }) => {
      try {
        // Call the original tool
        const originalResult = await runner.runTool({
          toolId: 'hackathon.catchup.external.slack',
          toolParams: { since, keywords, includeDMs },
        });

        // Simplify the response
        const originalData = originalResult.results[0]?.data;
        if (!originalData) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  total: 0,
                  since,
                  keywords: keywords || [],
                },
              },
            ],
          };
        }

        const simplified = simplifyToolResult(originalResult.results);
        const simplifiedData = simplified || {
          total: originalData.total || 0,
          since: originalData.since || since,
          keywords: originalData.keywords || keywords || [],
          channels_searched: originalData.channels_searched || 0,
        };

        // Return data as JSON string to avoid Elasticsearch mapping issues
        // The workflow execution engine stores the entire response in a text field
        // We stringify the data so it can be stored, but downstream tools will parse it
        return {
          results: [
            {
              type: ToolResultType.other,
              data: JSON.stringify(simplifiedData),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in workflow Slack tool: ${errorMessage}`);
        return {
          results: [
            createErrorResult(`Error generating simplified Slack summary: ${errorMessage}`),
          ],
        };
      }
    },
    tags: ['external', 'slack', 'workflow', 'simplified'],
  };
};

/**
 * Simplified correlation engine tool for workflows
 * Wraps the original tool and stringifies the response
 */
const workflowCorrelationEngineSchema = z.object({
  results: z
    .record(z.unknown())
    .describe(
      'Aggregated results from all catchup tools (security, observability, search, external)'
    ),
  entities: z
    .record(z.unknown())
    .optional()
    .describe(
      'Optional extracted entities from entity_extraction tool. If provided, will be used for enhanced correlation.'
    ),
});

export const workflowCorrelationEngineTool = (): BuiltinToolDefinition<
  typeof workflowCorrelationEngineSchema
> => {
  return {
    id: 'hackathon.catchup.workflow.correlation.engine',
    type: ToolType.builtin,
    description: `Simplified correlation engine tool optimized for workflow execution.
    Wraps the original correlation engine tool and stringifies responses to avoid storage issues.
    Use this tool in workflows instead of hackathon.catchup.correlation.engine.`,
    schema: workflowCorrelationEngineSchema,
    handler: async ({ results, entities }, { runner, logger }) => {
      try {
        // Call the original tool
        const originalResult = await runner.runTool({
          toolId: 'hackathon.catchup.correlation.engine',
          toolParams: { results, entities },
        });

        // Check for error results
        const errorResult = originalResult.results.find(
          (r: any) => r.type === ToolResultType.error
        );
        if (errorResult) {
          return {
            results: [errorResult],
          };
        }

        // Extract the correlation data
        const originalData = originalResult.results[0]?.data;
        if (!originalData) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: JSON.stringify({
                  correlations: [],
                  total_correlations: 0,
                  entities_used: entities ? true : false,
                }),
              },
            ],
          };
        }

        // Return data as JSON string to avoid Elasticsearch mapping issues
        // The workflow execution engine stores the entire response in a text field
        // We stringify the data so it can be stored, but downstream tools will parse it
        return {
          results: [
            {
              type: ToolResultType.other,
              data: JSON.stringify(originalData),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in workflow correlation engine tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error correlating events: ${errorMessage}`)],
        };
      }
    },
    tags: ['correlation', 'workflow', 'simplified'],
  };
};

/**
 * Simplified rerank tool for workflows
 * Wraps the original tool and stringifies the response
 */
const workflowRerankSchema = z.object({
  items: z
    .union([z.array(z.record(z.unknown())), z.record(z.unknown()), z.string()])
    .describe(
      'Array of items to rerank, or workflow response object/string that will be parsed to extract items'
    )
    .transform((value) => {
      // If already an array, return it
      if (Array.isArray(value)) {
        return value;
      }

      // If it's a string, try to parse it as JSON
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Recursively handle parsed value
          if (Array.isArray(parsed)) {
            return parsed;
          }
          // Continue processing as object
          value = parsed;
        } catch {
          return [];
        }
      }

      // If it's a workflow response structure {results: [{data: ...}]}
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.results && Array.isArray(value.results) && value.results.length > 0) {
          let data = value.results[0]?.data;

          // If data is stringified, parse it
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch {
              return [];
            }
          }

          // Extract correlations or prioritized_items array
          if (data?.correlations && Array.isArray(data.correlations)) {
            return data.correlations;
          }
          if (data?.prioritized_items && Array.isArray(data.prioritized_items)) {
            return data.prioritized_items;
          }
          if (Array.isArray(data)) {
            return data;
          }
        }

        // Direct access to correlations or prioritized_items
        if (value.correlations && Array.isArray(value.correlations)) {
          return value.correlations;
        }
        if (value.prioritized_items && Array.isArray(value.prioritized_items)) {
          return value.prioritized_items;
        }
      }

      // Default to empty array if we can't extract anything
      return [];
    })
    .pipe(z.array(z.record(z.unknown()))),
  query: z
    .string()
    .describe('Query text used for reranking (e.g., "security incidents", "critical alerts")'),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of items to return after reranking'),
  inferenceId: z
    .string()
    .optional()
    .describe(
      'Inference endpoint ID for reranking model. If not provided, will attempt to use default reranker.'
    ),
  textField: z
    .string()
    .optional()
    .describe(
      'Field name containing text to rerank. Defaults to "text", "message", "title", or "description" based on item structure.'
    ),
});

export const workflowRerankTool = (): BuiltinToolDefinition<typeof workflowRerankSchema> => {
  return {
    id: 'hackathon.catchup.workflow.prioritization.rerank',
    type: ToolType.builtin,
    description: `Simplified rerank tool optimized for workflow execution.
    Wraps the original rerank tool and stringifies responses to avoid storage issues.
    Use this tool in workflows instead of hackathon.catchup.prioritization.rerank.`,
    schema: workflowRerankSchema,
    handler: async ({ items, query, limit, inferenceId, textField }, { runner, logger }) => {
      try {
        // Call the original tool
        const originalResult = await runner.runTool({
          toolId: 'hackathon.catchup.prioritization.rerank',
          toolParams: { items, query, limit, inferenceId, textField },
        });

        // Check for error results
        const errorResult = originalResult.results.find(
          (r: any) => r.type === ToolResultType.error
        );
        if (errorResult) {
          return {
            results: [errorResult],
          };
        }

        // Extract the rerank data
        const originalData = originalResult.results[0]?.data;
        if (!originalData) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: JSON.stringify({
                  prioritized_items: [],
                  total: 0,
                  query,
                }),
              },
            ],
          };
        }

        // Return data as JSON string to avoid Elasticsearch mapping issues
        // The workflow execution engine stores the entire response in a text field
        // We stringify the data so it can be stored, but downstream tools will parse it
        return {
          results: [
            {
              type: ToolResultType.other,
              data: JSON.stringify(originalData),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in workflow rerank tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error reranking items: ${errorMessage}`)],
        };
      }
    },
    tags: ['prioritization', 'rerank', 'workflow', 'simplified'],
  };
};

/**
 * Simplified summary generator tool for workflows
 * Wraps the original tool and stringifies the response
 */
const workflowSummaryGeneratorSchema = z.object({
  correlatedData: z.record(z.unknown()).describe('Correlated data from correlation engine'),
  format: z
    .enum(['markdown', 'json'])
    .optional()
    .default('markdown')
    .describe('Output format: markdown or json'),
});

export const workflowSummaryGeneratorTool = (): BuiltinToolDefinition<
  typeof workflowSummaryGeneratorSchema
> => {
  const toolId = 'hackathon.catchup.workflow.summary.generator';
  return {
    id: toolId,
    type: ToolType.builtin,
    description: `Simplified summary generator tool optimized for workflow execution.
    Wraps the original summary generator tool and stringifies responses to avoid storage issues.
    Use this tool in workflows instead of hackathon.catchup.summary.generator.`,
    schema: workflowSummaryGeneratorSchema,
    handler: async ({ correlatedData, format = 'markdown' }, { runner, logger }) => {
      logger.info(
        `==> Workflow Summary Generator [${toolId}]: Handler INVOKED with format: ${format}`
      );
      logger.info(
        `==> Workflow Summary Generator [${toolId}]: correlatedData type: ${typeof correlatedData}, keys: ${
          correlatedData ? Object.keys(correlatedData).join(', ') : 'null'
        }`
      );
      try {
        // Call the original tool
        logger.info(
          `==> Workflow Summary Generator: Calling base tool hackathon.catchup.summary.generator`
        );
        const originalResult = await runner.runTool({
          toolId: 'hackathon.catchup.summary.generator',
          toolParams: { correlatedData, format },
        });
        logger.info(
          `==> Workflow Summary Generator: Base tool returned ${
            originalResult.results?.length || 0
          } results`
        );

        // Check for error results
        const errorResult = originalResult.results.find(
          (r: any) => r.type === ToolResultType.error
        );
        if (errorResult) {
          return {
            results: [errorResult],
          };
        }

        // Extract the summary data
        const originalData = originalResult.results[0]?.data;
        if (!originalData) {
          logger.warn('Workflow summary generator: No data returned from original tool');
          return {
            results: [
              {
                type: ToolResultType.other,
                data: JSON.stringify({
                  summary: '',
                  format: format || 'markdown',
                }),
              },
            ],
          };
        }

        // Log summary info for debugging
        const summaryText = originalData.summary || '';
        const summaryLength = typeof summaryText === 'string' ? summaryText.length : 0;
        const hasCorrelations =
          typeof summaryText === 'string' && summaryText.includes('## Correlations');
        const correlationsCount =
          typeof summaryText === 'string'
            ? (summaryText.match(/## Correlations/g) || []).length
            : 0;
        logger.info(
          `==> Workflow Summary Generator: CRITICAL CHECK - Summary length: ${summaryLength}, Has Correlations section: ${hasCorrelations}, Correlations header count: ${correlationsCount}`
        );
        if (hasCorrelations) {
          const correlationsIndex = summaryText.indexOf('## Correlations');
          const correlationsPreview = summaryText.substring(
            correlationsIndex,
            Math.min(correlationsIndex + 500, summaryText.length)
          );
          logger.info(
            `==> Workflow Summary Generator: CRITICAL - Correlations section found at index ${correlationsIndex}`
          );
          logger.info(
            `==> Workflow Summary Generator: CRITICAL - Correlations section preview (500 chars): ${correlationsPreview}`
          );
          // Log the end of the summary to verify it's complete
          const summaryEnd = summaryText.substring(Math.max(0, summaryText.length - 300));
          logger.info(
            `==> Workflow Summary Generator: Summary ends with (last 300 chars): ${summaryEnd}`
          );
        } else {
          logger.error(
            `==> Workflow Summary Generator: ERROR - Correlations section NOT found in summary! Summary length: ${summaryLength}`
          );
          logger.error(
            `==> Workflow Summary Generator: ERROR - Summary ends with: ${summaryText.substring(
              Math.max(0, summaryText.length - 200)
            )}`
          );
        }

        // CRITICAL: Return the summary as a direct string in the data field
        // This ensures the full summary is preserved and not truncated
        // The workflow execution engine stores this in a text field, so we return it directly
        // as a string rather than nested in an object to avoid any truncation issues
        if (typeof summaryText === 'string' && summaryText.length > 0) {
          logger.info(
            `==> Workflow Summary Generator: Returning summary as direct string, length: ${summaryText.length}`
          );
          return {
            results: [
              {
                type: ToolResultType.other,
                data: summaryText, // Return the markdown directly as a string
              },
            ],
          };
        }

        // Fallback: return as JSON string if summary is not a string
        const stringifiedData = JSON.stringify(originalData);
        logger.info(
          `==> Workflow Summary Generator: Stringified data length: ${stringifiedData.length} characters`
        );
        return {
          results: [
            {
              type: ToolResultType.other,
              data: stringifiedData,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in workflow summary generator tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error generating summary: ${errorMessage}`)],
        };
      }
    },
    tags: ['summary', 'generator', 'workflow', 'simplified'],
  };
};
