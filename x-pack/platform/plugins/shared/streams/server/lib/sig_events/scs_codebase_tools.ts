/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

/**
 * Kibana Workflow IDs for the SCS agentic interfaces installed by
 * `scs install-agentic-interfaces`. These are deterministic UUIDs derived
 * from the SDK namespace + workflow sdkId using UUIDv5.
 *
 * SDK namespace: uuidV5(DNS_UUID, 'kibana-agent-builder-sdk')
 *   = cdd25ba0-c280-5396-8018-b71458577d90
 *
 * workflow-<uuidV5(sdkNamespace, sdkId)>:
 *   scs.semantic_search  -> workflow-38aec933-751e-5da9-b915-c6353529cc96
 *   scs.symbol_analysis  -> workflow-0ccbb4a8-608d-5185-af15-e9b134029bfe
 */
export const SCS_SEMANTIC_SEARCH_WORKFLOW_ID = 'workflow-38aec933-751e-5da9-b915-c6353529cc96';
export const SCS_SYMBOL_ANALYSIS_WORKFLOW_ID = 'workflow-0ccbb4a8-608d-5185-af15-e9b134029bfe';

export interface ScsCodebaseTools {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  promptSnippet: string;
}

interface ScsSearchResult {
  id: string;
  score: number;
  type: string;
  language: string;
  kind: string;
  content: string;
  locations: Array<{ filePath: string; startLine: number }>;
}

interface WorkflowExecutionOutput {
  steps?: Record<string, { output?: unknown }>;
  output?: unknown;
}

function extractSearchResults(execution: WorkflowExecutionOutput): ScsSearchResult[] {
  try {
    const stepsOutput = execution?.steps;
    if (!stepsOutput) return [];
    for (const step of Object.values(stepsOutput)) {
      const output = step?.output;
      if (Array.isArray(output)) {
        return output as ScsSearchResult[];
      }
      if (typeof output === 'string') {
        return JSON.parse(output) as ScsSearchResult[];
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Creates tool definitions and callbacks that give the query generation
 * reasoning agent the ability to search a SCS-indexed codebase via the
 * Kibana Workflows installed by `scs install-agentic-interfaces`.
 *
 * Mirrors the shape of {@link MemoryDiscoveryTools} so it can be merged
 * alongside memory tools in `generateSignificantEventDefinitions`.
 */
export const createScsCodebaseTools = ({
  workflowsManagement,
  scsIndexName,
  spaceId,
  request,
}: {
  workflowsManagement: WorkflowsManagementApi;
  scsIndexName: string;
  spaceId: string;
  request: KibanaRequest;
}): ScsCodebaseTools => {
  const tools: Record<string, ToolDefinition> = {
    search_codebase: {
      description:
        'Semantically search the indexed source codebase for relevant code patterns, field names, event structures, or ES|QL examples. Use this when you need to understand what fields the application emits, how events are structured, or to find existing ES|QL patterns in the codebase.',
      schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description:
              'Natural-language search query. Descriptive phrases work better than single keywords (e.g. "error handling with status codes" rather than "error").',
          },
          size: {
            type: 'number' as const,
            description: 'Maximum number of code chunks to return (default 5, max 20).',
          },
        },
        required: ['query'] as const,
      },
    },
    analyze_codebase_symbol: {
      description:
        'Deeply analyze a specific symbol (function, class, variable, constant) across the indexed codebase. Returns definitions, call sites, import references, and documentation. Use when you need to understand a specific field name, event type, or error code in depth.',
      schema: {
        type: 'object' as const,
        properties: {
          symbol_name: {
            type: 'string' as const,
            description:
              'Exact symbol name to analyze (e.g. "handleRequest", "ERROR_CODE_TIMEOUT", "UserService").',
          },
        },
        required: ['symbol_name'] as const,
      },
    },
  };

  const callbacks: Record<string, ToolCallback> = {
    search_codebase: async (toolCall) => {
      const { query, size } = toolCall.function.arguments as {
        query: string;
        size?: number;
      };
      try {
        const { execution } = await workflowsManagement.executeWorkflow({
          workflowId: SCS_SEMANTIC_SEARCH_WORKFLOW_ID,
          inputs: {
            query,
            index: scsIndexName,
            size: Math.min(size ?? 5, 20),
          },
          spaceId,
          request,
          waitForCompletion: true,
        });

        const results = extractSearchResults(execution as WorkflowExecutionOutput);
        return {
          response: {
            results: results.map(({ id, score, language, kind, content, locations }) => ({
              id,
              score,
              language,
              kind,
              content,
              locations: locations?.slice(0, 3),
            })),
            count: results.length,
          },
        };
      } catch (error) {
        return {
          response: {
            results: [],
            count: 0,
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
    analyze_codebase_symbol: async (toolCall) => {
      const { symbol_name: symbolName } = toolCall.function.arguments as {
        symbol_name: string;
      };
      try {
        const { execution } = await workflowsManagement.executeWorkflow({
          workflowId: SCS_SYMBOL_ANALYSIS_WORKFLOW_ID,
          inputs: {
            symbol_name: symbolName,
            index: scsIndexName,
          },
          spaceId,
          request,
          waitForCompletion: true,
        });

        const stepsOutput = (execution as WorkflowExecutionOutput)?.steps ?? {};
        const formatStep = Object.values(stepsOutput).at(-1);
        const report =
          typeof formatStep?.output === 'string'
            ? formatStep.output
            : JSON.stringify(formatStep?.output ?? {});

        return {
          response: {
            symbol: symbolName,
            report,
          },
        };
      } catch (error) {
        return {
          response: {
            symbol: symbolName,
            report: null,
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };

  const promptSnippet = `
You have access to a semantically indexed source codebase via SCS (Semantic Code Search). Use these tools to find patterns and context that will help you write more accurate ES|QL queries:
- **search_codebase** — Search the codebase by natural language to find how events are emitted, what fields are logged, or how errors are structured. Use this before writing queries to discover real field names and event patterns.
- **analyze_codebase_symbol** — Deep-dive on a specific symbol (function name, constant, class) to understand its definition, call sites, and imports.

Prioritize searching the codebase when you need to verify field names, understand event structures, or find existing query patterns. Code evidence makes queries more accurate.`;

  return { tools, callbacks, promptSnippet };
};
