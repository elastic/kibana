/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { ToolsStart } from '@kbn/agent-builder-server';
import { ToolResultType, type ToolResult } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * Agent Builder tool IDs installed by Semantic Code Search (SCS) via
 * `scs install-agentic-interfaces`. SCS registers each workflow-backed tool
 * under the `scs.<workflow_name>` id.
 */
export const SCS_SEMANTIC_SEARCH_TOOL_ID = 'scs.semantic_search';
export const SCS_READ_FILE_TOOL_ID = 'scs.read_file_from_chunks';

export interface SemanticCodeSearchTools {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  promptSnippet: string;
}

/**
 * Maps Agent Builder tool results into a plain, LLM-friendly payload.
 * Error results are surfaced under `error`; everything else is passed through
 * as `{ type, data }` so the reasoning agent can read the workflow output.
 */
const formatToolResults = (results: ToolResult[] | undefined) => {
  const list = results ?? [];
  const errors = list
    .filter((result) => result.type === ToolResultType.error)
    .map((result) => (result.data as { message?: string })?.message ?? 'Unknown tool error');

  const data = list
    .filter((result) => result.type !== ToolResultType.error)
    .map((result) => ({ type: result.type, data: result.data }));

  return {
    results: data,
    count: data.length,
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  };
};

/**
 * Semantic Code Search (SCS) tool definitions and callbacks for use in
 * significant events query generation (executeAsReasoningAgent). The callbacks
 * bridge the inference reasoning agent to the SCS Kibana workflows by executing
 * the installed Agent Builder workflow tools.
 *
 * Read-only: these tools only query indexed source code; they never modify it.
 * Every callback degrades gracefully — failures are returned to the model
 * instead of throwing so query generation never breaks because of code
 * grounding.
 */
export const createSemanticCodeSearchTools = ({
  agentBuilderTools,
  request,
  codeIndex,
  logger,
}: {
  agentBuilderTools: ToolsStart;
  request: KibanaRequest;
  codeIndex: string;
  logger: Logger;
}): SemanticCodeSearchTools => {
  const tools: Record<string, ToolDefinition> = {
    code_search: {
      description:
        'Semantic search over the source code that produces this stream. Use it to find the exact log/error message strings, error types, and dependency calls emitted by the code before writing ES|QL. Returns code snippets with file paths and line numbers.',
      schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description:
              'Natural-language search phrase describing the code you are looking for (e.g. "where connection refused is logged").',
          },
          kql: {
            type: 'string' as const,
            description:
              'Optional KQL filter on code metadata (e.g. \'language:"go" and kind:"function_declaration"\').',
          },
          size: {
            type: 'number' as const,
            description: 'Maximum number of code snippets to return (default 25).',
          },
        },
      },
    },
    read_code_file: {
      description:
        'Reconstruct one or more full source files from the indexed code, to inspect the surrounding implementation of a snippet found via code_search.',
      schema: {
        type: 'object' as const,
        properties: {
          file_paths: {
            type: 'string' as const,
            description:
              'Comma-separated list of repository-relative file paths to read (e.g. "src/handler.go,src/util.go").',
          },
        },
        required: ['file_paths'] as const,
      },
    },
  };

  const runScsTool = async (toolId: string, toolParams: Record<string, unknown>) => {
    const startTime = Date.now();
    try {
      const { results } = await agentBuilderTools.execute({
        toolId,
        toolParams: { ...toolParams, index: codeIndex },
        request,
      });
      logger.debug(`SCS tool "${toolId}" completed in ${Date.now() - startTime}ms`);
      return { response: formatToolResults(results) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`SCS tool "${toolId}" failed after ${Date.now() - startTime}ms: ${message}`);
      return { response: { results: [], count: 0, error: message } };
    }
  };

  const callbacks: Record<string, ToolCallback> = {
    code_search: async (toolCall) => {
      const { query, kql, size } = toolCall.function.arguments as {
        query?: string;
        kql?: string;
        size?: number;
      };
      return runScsTool(SCS_SEMANTIC_SEARCH_TOOL_ID, {
        ...(query !== undefined ? { query } : {}),
        ...(kql !== undefined ? { kql } : {}),
        ...(size !== undefined ? { size } : {}),
      });
    },
    read_code_file: async (toolCall) => {
      const { file_paths: filePaths } = toolCall.function.arguments as { file_paths?: string };
      if (!filePaths) {
        return { response: { results: [], count: 0, error: '"file_paths" is required.' } };
      }
      return runScsTool(SCS_READ_FILE_TOOL_ID, { file_paths: filePaths });
    },
  };

  const promptSnippet = `
You can also consult the source code that produces this stream's logs, indexed in code index "${codeIndex}". Use it to *verify* hypotheses — never as a starting point:
- **code_search** — semantically search the code for the exact log/error strings, error types, and dependency calls it emits.
- **read_code_file** — read full files to inspect surrounding implementation.

Analyze the stream features and dataset_analysis first; they reflect what is actually emitted. Use code only to refine query terms (e.g. confirm the precise wording of a logged message before choosing \`MATCH_PHRASE\` vs \`:\`) and to corroborate dependencies. The code may be a different version than what is running, so it is a hint, not ground truth — never let it override dataset_analysis. When a query is grounded in code, record it in that query's \`evidence\` as \`code: <file>:<line> <snippet>\`.`;

  return { tools, callbacks, promptSnippet };
};
