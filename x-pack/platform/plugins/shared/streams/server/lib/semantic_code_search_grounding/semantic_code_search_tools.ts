/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { ToolsStart } from '@kbn/agent-builder-server';
import { ToolResultType, type ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { resolveRepositoryForCodeIndex } from './resolve_code_index';

/**
 * Agent Builder tool IDs installed by Semantic Code Search (SCS) via
 * `scs install-agentic-interfaces`. SCS registers each workflow-backed tool
 * under the `scs.<workflow_name>` id.
 */
export const SCS_SEMANTIC_SEARCH_TOOL_ID = 'scs.semantic_search';
export const SCS_READ_FILE_TOOL_ID = 'scs.read_file_from_chunks';
export const SCS_SYMBOL_ANALYSIS_TOOL_ID = 'scs.symbol_analysis';
export const SCS_LIST_INDICES_TOOL_ID = 'scs.list_indices';

/**
 * Git-history workflow tools installed by SCS alongside the code-search tools.
 * These query the separate `code-history-*` indices and are keyed by a
 * `repository` identifier (`owner/repo`) rather than a code index. The
 * repository for the active code index is resolved lazily on selection.
 */
export const SCS_FILE_HISTORY_TOOL_ID = 'scs.get_file_history';
export const SCS_GET_COMMIT_TOOL_ID = 'scs.get_commit';
export const SCS_FIND_INTRODUCING_COMMIT_TOOL_ID = 'scs.find_introducing_commit';
export const SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID = 'scs.search_commit_messages';
export const SCS_COCHANGES_TOOL_ID = 'scs.get_cochanges';
export const SCS_FILE_AUTHORS_TOOL_ID = 'scs.get_file_authors';

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

const NO_ACTIVE_INDEX_ERROR =
  'No code index is selected. Call list_code_indices to see the available indices, then select_code_index with the one whose repository produces this stream before using this tool.';

/**
 * Semantic Code Search (SCS) tool definitions and callbacks for use in
 * significant events query generation (executeAsReasoningAgent). The callbacks
 * bridge the inference reasoning agent to the SCS Kibana workflows by executing
 * the installed Agent Builder workflow tools.
 *
 * The reasoning agent selects which code index to ground against at runtime:
 * `list_code_indices` enumerates the available `code-*` indices and
 * `select_code_index` activates one (resolving its git repository so the
 * git-history tools can be used). When the stream is explicitly linked to a
 * code index (`codeIndex`), that index is pre-selected so the agent can search
 * immediately, but it may still switch to a different one.
 *
 * Read-only: these tools only query indexed source code; they never modify it.
 * Every callback degrades gracefully — failures are returned to the model
 * instead of throwing so query generation never breaks because of code
 * grounding.
 */
export const createSemanticCodeSearchTools = ({
  agentBuilderTools,
  request,
  esClient,
  codeIndex,
  logger,
}: {
  agentBuilderTools: ToolsStart;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  /**
   * Optional code index the stream is explicitly linked to. When provided it is
   * pre-selected as the active index; otherwise the agent must discover and
   * select one via list_code_indices / select_code_index.
   */
  codeIndex?: string;
  logger: Logger;
}): SemanticCodeSearchTools => {
  // Active index/repository are mutable across the reasoning agent's
  // sequential tool calls. They start from the explicitly linked index (if any)
  // and are updated when the agent calls select_code_index.
  let activeIndex: string | undefined = codeIndex;
  let activeRepository: string | undefined;

  const repositoryCache = new Map<string, string | undefined>();
  const resolveRepository = async (index: string): Promise<string | undefined> => {
    if (repositoryCache.has(index)) {
      return repositoryCache.get(index);
    }
    const repository = await resolveRepositoryForCodeIndex({ esClient, codeIndex: index, logger });
    repositoryCache.set(index, repository);
    return repository;
  };

  const tools: Record<string, ToolDefinition> = {
    list_code_indices: {
      description:
        'List the Semantic Code Search indices available in this cluster, with per-index stats (files, symbols, languages, content types). Use it to discover which codebase to ground against when this stream is not already linked to a code index.',
      schema: {
        type: 'object' as const,
        properties: {},
      },
    },
    select_code_index: {
      description:
        "Select the code index to ground subsequent code_search / read_code_file / analyze_symbol calls against. Choose the index whose repository produces this stream's logs, using the stream name, description, and dataset_analysis (service names, languages, dependency calls) to decide. Resolves the index's git repository so the git_* history tools become usable. If no index clearly matches the stream, do not select one and proceed without code grounding.",
      schema: {
        type: 'object' as const,
        properties: {
          index: {
            type: 'string' as const,
            description:
              'Exact code index name to activate, as returned by list_code_indices (e.g. "code-acme_checkout").',
          },
        },
        required: ['index'] as const,
      },
    },
    code_search: {
      description:
        'Semantic search over the source code of the selected index. Use it to find the exact log/error message strings, error types, and dependency calls emitted by the code before writing ES|QL. Returns code snippets with file paths and line numbers.',
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
            description: 'Maximum number of code snippets to return (default 8).',
          },
        },
      },
    },
    read_code_file: {
      description:
        'Reconstruct one or more full source files from the selected index, to inspect the surrounding implementation of a snippet found via code_search.',
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
    analyze_symbol: {
      description:
        'Resolve a specific code symbol (an exact name found via code_search, e.g. an error/exception class, a logger wrapper, or a constant holding a message template) to its definitions, usages, and documentation. Use it to confirm the precise wording or error types behind a log site — not for open-ended code exploration.',
      schema: {
        type: 'object' as const,
        properties: {
          symbol_name: {
            type: 'string' as const,
            description:
              'Exact symbol name to analyze (e.g. "ConnectionRefusedError", "logRequestFailure"). Must be an exact identifier discovered via code_search.',
          },
        },
        required: ['symbol_name'] as const,
      },
    },
    git_search_commits: {
      description:
        'Semantic (natural-language) search over the selected repository\'s commit messages. Use it to find when/why a behavior or log message was introduced or changed (e.g. "added retry on connection refused"). Returns matching commits with hashes, messages, and dates.',
      schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description:
              'Natural-language description of the change you are looking for (e.g. "fix memory leak in cache", "add rate limiting").',
          },
          file_paths: {
            type: 'string' as const,
            description:
              'Optional comma-separated list of repository-relative file paths (no spaces around commas) to scope the search to commits that touched those files.',
          },
          time_range_start: {
            type: 'string' as const,
            description: 'Optional ISO 8601 start date (e.g. "2024-01-01").',
          },
          time_range_end: {
            type: 'string' as const,
            description: 'Optional ISO 8601 end date (e.g. "2024-12-31").',
          },
        },
        required: ['query'] as const,
      },
    },
    git_find_introducing_commit: {
      description:
        'Find the commit(s) that first introduced an exact code phrase or log/error string, by phrase-matching the commit diffs (oldest-first). Use it to confirm a log message exists in the code history and to date when it appeared.',
      schema: {
        type: 'object' as const,
        properties: {
          symbol_pattern: {
            type: 'string' as const,
            description:
              'Exact phrase to search for in commit diffs (word order matters), e.g. "connection refused", "function handleAuth".',
          },
          file_path: {
            type: 'string' as const,
            description:
              'Optional repository-relative file path to narrow the search (exact match).',
          },
        },
        required: ['symbol_pattern'] as const,
      },
    },
    git_file_history: {
      description:
        'Return the commit history of a specific file (newest-first), including hashes, change types, line stats, and commit subjects. Use it to understand how a log site has evolved.',
      schema: {
        type: 'object' as const,
        properties: {
          file_path: {
            type: 'string' as const,
            description:
              'Repository-relative file path (exact match), e.g. "src/server/routes/auth.ts".',
          },
          after: {
            type: 'string' as const,
            description: 'Optional ISO 8601 date — only commits on or after this date.',
          },
          before: {
            type: 'string' as const,
            description: 'Optional ISO 8601 date — only commits on or before this date.',
          },
        },
        required: ['file_path'] as const,
      },
    },
    git_show_commit: {
      description:
        'Return full details for a specific commit (message, author, stats, and per-file changes/diffs). Use it to inspect a commit found via git_search_commits or git_find_introducing_commit.',
      schema: {
        type: 'object' as const,
        properties: {
          commit_hash: {
            type: 'string' as const,
            description:
              'The full 40-character commit hash (abbreviated hashes are not supported).',
          },
          include_diffs: {
            type: 'boolean' as const,
            description:
              'Whether to include per-file diff content (default true). Set false for a compact view.',
          },
        },
        required: ['commit_hash'] as const,
      },
    },
    git_cochanges: {
      description:
        'Identify files that frequently change in the same commits as a target file (coupling analysis). Use it to discover related code that may emit correlated log events.',
      schema: {
        type: 'object' as const,
        properties: {
          file_path: {
            type: 'string' as const,
            description: 'Target repository-relative file path (exact match).',
          },
          since: {
            type: 'string' as const,
            description: 'Optional ISO 8601 date — only consider commits on or after this date.',
          },
        },
        required: ['file_path'] as const,
      },
    },
    git_file_authors: {
      description:
        'Return an author contribution leaderboard for one or more files (commit counts, line stats, last commit). Use it to identify owners/subject-matter experts of a log site.',
      schema: {
        type: 'object' as const,
        properties: {
          file_paths: {
            type: 'string' as const,
            description:
              'Comma-separated list of repository-relative file paths (no spaces around commas).',
          },
          since: {
            type: 'string' as const,
            description: 'Optional ISO 8601 date — only consider commits on or after this date.',
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
        toolParams,
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

  /**
   * Resolves the repository for the active index (lazily, memoized) for the
   * git-history tools. Returns an error response when no index is selected or
   * the selected index has no associated git history.
   */
  const requireActiveRepository = async (): Promise<
    { repository: string } | { error: { response: { results: never[]; count: 0; error: string } } }
  > => {
    if (!activeIndex) {
      return { error: { response: { results: [], count: 0, error: NO_ACTIVE_INDEX_ERROR } } };
    }
    const repository = activeRepository ?? (await resolveRepository(activeIndex));
    if (!repository) {
      return {
        error: {
          response: {
            results: [],
            count: 0,
            error: `No git history is available for the selected index "${activeIndex}".`,
          },
        },
      };
    }
    return { repository };
  };

  const callbacks: Record<string, ToolCallback> = {
    list_code_indices: async () => runScsTool(SCS_LIST_INDICES_TOOL_ID, {}),
    select_code_index: async (toolCall) => {
      const { index } = toolCall.function.arguments as { index?: string };
      if (!index) {
        return { response: { results: [], count: 0, error: '"index" is required.' } };
      }
      activeIndex = index;
      activeRepository = await resolveRepository(index);
      return {
        response: {
          selected_index: index,
          git_history_available: Boolean(activeRepository),
          ...(activeRepository ? { repository: activeRepository } : {}),
        },
      };
    },
    code_search: async (toolCall) => {
      if (!activeIndex) {
        return { response: { results: [], count: 0, error: NO_ACTIVE_INDEX_ERROR } };
      }
      const { query, kql, size } = toolCall.function.arguments as {
        query?: string;
        kql?: string;
        size?: number;
      };
      return runScsTool(SCS_SEMANTIC_SEARCH_TOOL_ID, {
        ...(query !== undefined ? { query } : {}),
        ...(kql !== undefined ? { kql } : {}),
        ...(size !== undefined ? { size } : {}),
        index: activeIndex,
      });
    },
    read_code_file: async (toolCall) => {
      if (!activeIndex) {
        return { response: { results: [], count: 0, error: NO_ACTIVE_INDEX_ERROR } };
      }
      const { file_paths: filePaths } = toolCall.function.arguments as { file_paths?: string };
      if (!filePaths) {
        return { response: { results: [], count: 0, error: '"file_paths" is required.' } };
      }
      return runScsTool(SCS_READ_FILE_TOOL_ID, { file_paths: filePaths, index: activeIndex });
    },
    analyze_symbol: async (toolCall) => {
      if (!activeIndex) {
        return { response: { results: [], count: 0, error: NO_ACTIVE_INDEX_ERROR } };
      }
      const { symbol_name: symbolName } = toolCall.function.arguments as { symbol_name?: string };
      if (!symbolName) {
        return { response: { results: [], count: 0, error: '"symbol_name" is required.' } };
      }
      return runScsTool(SCS_SYMBOL_ANALYSIS_TOOL_ID, {
        symbol_name: symbolName,
        index: activeIndex,
      });
    },
    git_search_commits: async (toolCall) => {
      const {
        query,
        file_paths: filePaths,
        time_range_start: timeRangeStart,
        time_range_end: timeRangeEnd,
      } = toolCall.function.arguments as {
        query?: string;
        file_paths?: string;
        time_range_start?: string;
        time_range_end?: string;
      };
      if (!query) {
        return { response: { results: [], count: 0, error: '"query" is required.' } };
      }
      const resolved = await requireActiveRepository();
      if ('error' in resolved) {
        return resolved.error;
      }
      return runScsTool(SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID, {
        query,
        ...(filePaths !== undefined ? { file_paths: filePaths } : {}),
        ...(timeRangeStart !== undefined ? { time_range_start: timeRangeStart } : {}),
        ...(timeRangeEnd !== undefined ? { time_range_end: timeRangeEnd } : {}),
        repository: resolved.repository,
      });
    },
    git_find_introducing_commit: async (toolCall) => {
      const { symbol_pattern: symbolPattern, file_path: filePath } = toolCall.function
        .arguments as { symbol_pattern?: string; file_path?: string };
      if (!symbolPattern) {
        return { response: { results: [], count: 0, error: '"symbol_pattern" is required.' } };
      }
      const resolved = await requireActiveRepository();
      if ('error' in resolved) {
        return resolved.error;
      }
      return runScsTool(SCS_FIND_INTRODUCING_COMMIT_TOOL_ID, {
        symbol_pattern: symbolPattern,
        ...(filePath !== undefined ? { file_path: filePath } : {}),
        repository: resolved.repository,
      });
    },
    git_file_history: async (toolCall) => {
      const {
        file_path: filePath,
        after,
        before,
      } = toolCall.function.arguments as {
        file_path?: string;
        after?: string;
        before?: string;
      };
      if (!filePath) {
        return { response: { results: [], count: 0, error: '"file_path" is required.' } };
      }
      const resolved = await requireActiveRepository();
      if ('error' in resolved) {
        return resolved.error;
      }
      return runScsTool(SCS_FILE_HISTORY_TOOL_ID, {
        file_path: filePath,
        ...(after !== undefined ? { after } : {}),
        ...(before !== undefined ? { before } : {}),
        repository: resolved.repository,
      });
    },
    git_show_commit: async (toolCall) => {
      const { commit_hash: commitHash, include_diffs: includeDiffs } = toolCall.function
        .arguments as { commit_hash?: string; include_diffs?: boolean };
      if (!commitHash) {
        return { response: { results: [], count: 0, error: '"commit_hash" is required.' } };
      }
      const resolved = await requireActiveRepository();
      if ('error' in resolved) {
        return resolved.error;
      }
      return runScsTool(SCS_GET_COMMIT_TOOL_ID, {
        commit_hash: commitHash,
        ...(includeDiffs !== undefined ? { include_diffs: includeDiffs } : {}),
        repository: resolved.repository,
      });
    },
    git_cochanges: async (toolCall) => {
      const { file_path: filePath, since } = toolCall.function.arguments as {
        file_path?: string;
        since?: string;
      };
      if (!filePath) {
        return { response: { results: [], count: 0, error: '"file_path" is required.' } };
      }
      const resolved = await requireActiveRepository();
      if ('error' in resolved) {
        return resolved.error;
      }
      return runScsTool(SCS_COCHANGES_TOOL_ID, {
        file_path: filePath,
        ...(since !== undefined ? { since } : {}),
        repository: resolved.repository,
      });
    },
    git_file_authors: async (toolCall) => {
      const { file_paths: filePaths, since } = toolCall.function.arguments as {
        file_paths?: string;
        since?: string;
      };
      if (!filePaths) {
        return { response: { results: [], count: 0, error: '"file_paths" is required.' } };
      }
      const resolved = await requireActiveRepository();
      if ('error' in resolved) {
        return resolved.error;
      }
      return runScsTool(SCS_FILE_AUTHORS_TOOL_ID, {
        file_paths: filePaths,
        ...(since !== undefined ? { since } : {}),
        repository: resolved.repository,
      });
    },
  };

  const selectionSnippet = codeIndex
    ? `This stream is linked to code index "${codeIndex}", which is pre-selected — you can search it immediately with code_search. To ground against a different codebase, call list_code_indices and then select_code_index.`
    : `No code index is pre-linked to this stream. To ground queries in source code, first call list_code_indices to see the available indices, then call select_code_index with the one whose repository produces this stream — use the stream name, description, and dataset_analysis (service names, languages, dependency calls) to choose. If none clearly matches, do not select one and proceed without code grounding.`;

  const promptSnippet = `
You can also consult the source code that produces this stream's logs to *verify* hypotheses — never as a starting point. ${selectionSnippet}

Once a code index is selected:
- **code_search** — semantically search the code for the exact log/error strings, error types, and dependency calls it emits.
- **read_code_file** — read full files to inspect surrounding implementation.
- **analyze_symbol** — resolve a specific symbol you already found via code_search (e.g. an exception class or a logging helper) to confirm its message wording or the error types it covers. Do not use it to explore unfamiliar code.

If the selected index has git history, you can also consult it to corroborate and date behavior:
- **git_search_commits** — semantically search commit messages for when/why a behavior or log message changed.
- **git_find_introducing_commit** — find the commit that first introduced an exact log/error string or code phrase.
- **git_file_history** — list a file's commit history; **git_show_commit** — inspect a single commit's diffs.
- **git_cochanges** / **git_file_authors** — find coupled files and code owners.
Use history only to confirm a log/error string still exists (not removed later) and to date behavior — never as a substitute for dataset_analysis.

Analyze the stream features and dataset_analysis first; they reflect what is actually emitted. Use code only to refine query terms (e.g. confirm the precise wording of a logged message before choosing \`MATCH_PHRASE\` vs \`:\`) and to corroborate dependencies. The code may be a different version than what is running, so it is a hint, not ground truth — never let it override dataset_analysis. When a query is grounded in code, record it in that query's \`evidence\` as \`code: <file>:<line> <snippet>\`.`;

  return { tools, callbacks, promptSnippet };
};
