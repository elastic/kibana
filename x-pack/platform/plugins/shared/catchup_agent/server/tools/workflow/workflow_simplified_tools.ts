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
  if (source.since !== undefined) simplified.start = source.since;

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
    id: 'hackathon.catchup.workflow_tool_summarizer',
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

        // Special handling for tools that don't need simplification - just stringify directly
        // Correlation engine and rerank tools return complex structures that simplifyToolResult doesn't handle
        if (
          tool_id === 'hackathon.catchup.correlation.engine' ||
          tool_id === 'hackathon.catchup.prioritization.rerank'
        ) {
          // These tools return data structures that don't need simplification
          // Just stringify the original data like the old workflow tools did
          if (!originalData) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: JSON.stringify({
                    correlations: tool_id === 'hackathon.catchup.correlation.engine' ? [] : undefined,
                    prioritized_items: tool_id === 'hackathon.catchup.prioritization.rerank' ? [] : undefined,
                    total: 0,
                  }),
                },
              ],
            };
          }
          return {
            results: [
              {
                type: ToolResultType.other,
                data: JSON.stringify(originalData),
              },
            ],
          };
        }

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

          // If simplification returned null, empty object, or empty, try to extract basic data from the original result
          if (
            !simplifiedData ||
            (typeof simplifiedData === 'object' &&
              simplifiedData !== null &&
              Object.keys(simplifiedData).length === 0) ||
            (Array.isArray(simplifiedData) && simplifiedData.length === 0)
          ) {
            if (originalData) {
              if (typeof originalData === 'object' && originalData !== null) {
                simplifiedData = originalData;
              } else {
                simplifiedData = { data: originalData };
              }
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

        // Special handling for summary generator tool - return markdown directly as string
        // This ensures the full summary is preserved and not truncated
        // The workflow execution engine stores this in a text field, so we return it directly
        // as a string rather than nested in an object to avoid any truncation issues
        if (tool_id === 'hackathon.catchup.summary.generator') {
          // The summary generator returns { summary: markdown, format: 'markdown' }
          // Extract the summary text from either originalData or simplifiedData
          const summaryText = originalData?.summary || simplifiedData?.summary || 
            (typeof simplifiedData === 'string' ? simplifiedData : null);
          if (typeof summaryText === 'string' && summaryText.length > 0) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: summaryText, // Return the markdown directly as a string
                },
              ],
            };
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
