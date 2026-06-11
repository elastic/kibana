/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { ToolsStart } from '@kbn/agent-builder-server';
import { resolveRepositoryForCodeIndex } from './resolve_code_index';
import {
  createInferenceToolsFromAgentBuilder,
  type BridgePrepareOutcome,
  type BridgedToolSpec,
} from './agent_builder_tool_bridge';

/**
 * Agent Builder tool IDs installed by Semantic Code Search (SCS) via
 * `scs install-agentic-interfaces`. SCS registers each workflow-backed tool
 * under the `scs.<workflow_name>` id. We delegate to these tools (their
 * parameter schemas are read from the Agent Builder registry at runtime via the
 * bridge) rather than re-declaring them here.
 */
export const SCS_SEMANTIC_SEARCH_TOOL_ID = 'scs.semantic_search';
export const SCS_READ_FILE_TOOL_ID = 'scs.read_file_from_chunks';
export const SCS_SYMBOL_ANALYSIS_TOOL_ID = 'scs.symbol_analysis';
export const SCS_LIST_INDICES_TOOL_ID = 'scs.list_indices';
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

const NO_ACTIVE_INDEX_ERROR =
  'No code index is selected. Call list_code_indices to see the available indices, then select_code_index with the one whose repository produces this stream before using this tool.';

/**
 * Semantic Code Search (SCS) tools for significant events query generation
 * (executeAsReasoningAgent). The code/git tools are bridged from the installed
 * Agent Builder SCS workflow tools — their schemas come from the Agent Builder
 * registry, and the callbacks delegate to `agentBuilderTools.execute`. This
 * factory only owns the Streams-specific concerns the registry can't know
 * about: which index is active, hiding/injecting the `index` / `repository`
 * params, the index-selection tools, and the prompt guidance.
 *
 * The reasoning agent selects which code index to ground against at runtime:
 * `list_code_indices` enumerates the available `code-*` indices and
 * `select_code_index` activates one (resolving its git repository so the
 * git-history tools can be used). When the stream is explicitly linked to a
 * code index (`codeIndex`), that index is pre-selected so the agent can search
 * immediately, but it may still switch to a different one.
 *
 * Returns `undefined` when none of the SCS workflow tools can be resolved (e.g.
 * SCS is not installed), so grounding degrades gracefully.
 *
 * Read-only: these tools only query indexed source code; they never modify it.
 */
export const createSemanticCodeSearchTools = async ({
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
}): Promise<SemanticCodeSearchTools | undefined> => {
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

  // Code tools require an active index; inject it as the `index` param.
  const requireActiveIndex = (): BridgePrepareOutcome =>
    activeIndex
      ? { params: { index: activeIndex } }
      : { error: { results: [], count: 0, error: NO_ACTIVE_INDEX_ERROR } };

  // Git-history tools require the active index to resolve to a repository;
  // inject it as the `repository` param.
  const requireActiveRepository = async (): Promise<BridgePrepareOutcome> => {
    if (!activeIndex) {
      return { error: { results: [], count: 0, error: NO_ACTIVE_INDEX_ERROR } };
    }
    const repository = activeRepository ?? (await resolveRepository(activeIndex));
    if (!repository) {
      return {
        error: {
          results: [],
          count: 0,
          error: `No git history is available for the selected index "${activeIndex}".`,
        },
      };
    }
    return { params: { repository } };
  };

  const specs: BridgedToolSpec[] = [
    {
      sourceToolId: SCS_LIST_INDICES_TOOL_ID,
      name: 'list_code_indices',
      description:
        'List the Semantic Code Search indices available in this cluster, with per-index stats (files, symbols, languages, content types). Use it to discover which codebase to ground against when this stream is not already linked to a code index.',
    },
    {
      sourceToolId: SCS_SEMANTIC_SEARCH_TOOL_ID,
      name: 'code_search',
      description:
        'Semantic search over the source code of the selected index. Use it to find the exact log/error message strings, error types, and dependency calls emitted by the code before writing ES|QL. Returns code snippets with file paths and line numbers.',
      hiddenParams: ['index'],
      prepare: requireActiveIndex,
    },
    {
      sourceToolId: SCS_READ_FILE_TOOL_ID,
      name: 'read_code_file',
      description:
        'Reconstruct one or more full source files from the selected index, to inspect the surrounding implementation of a snippet found via code_search.',
      hiddenParams: ['index'],
      prepare: requireActiveIndex,
    },
    {
      sourceToolId: SCS_SYMBOL_ANALYSIS_TOOL_ID,
      name: 'analyze_symbol',
      description:
        'Resolve a specific code symbol (an exact name found via code_search, e.g. an error/exception class, a logger wrapper, or a constant holding a message template) to its definitions, usages, and documentation. Use it to confirm the precise wording or error types behind a log site — not for open-ended code exploration.',
      hiddenParams: ['index'],
      prepare: requireActiveIndex,
    },
    {
      sourceToolId: SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID,
      name: 'git_search_commits',
      description:
        "Semantic (natural-language) search over the selected repository's commit messages. Use it to find when/why a behavior or log message was introduced or changed. Returns matching commits with hashes, messages, and dates.",
      hiddenParams: ['repository'],
      prepare: requireActiveRepository,
    },
    {
      sourceToolId: SCS_FIND_INTRODUCING_COMMIT_TOOL_ID,
      name: 'git_find_introducing_commit',
      description:
        'Find the commit(s) that first introduced an exact code phrase or log/error string, by phrase-matching the commit diffs (oldest-first). Use it to confirm a log message exists in the code history and to date when it appeared.',
      hiddenParams: ['repository'],
      prepare: requireActiveRepository,
    },
    {
      sourceToolId: SCS_FILE_HISTORY_TOOL_ID,
      name: 'git_file_history',
      description:
        'Return the commit history of a specific file (newest-first), including hashes, change types, line stats, and commit subjects. Use it to understand how a log site has evolved.',
      hiddenParams: ['repository'],
      prepare: requireActiveRepository,
    },
    {
      sourceToolId: SCS_GET_COMMIT_TOOL_ID,
      name: 'git_show_commit',
      description:
        'Return full details for a specific commit (message, author, stats, and per-file changes/diffs). Use it to inspect a commit found via git_search_commits or git_find_introducing_commit.',
      hiddenParams: ['repository'],
      prepare: requireActiveRepository,
    },
    {
      sourceToolId: SCS_COCHANGES_TOOL_ID,
      name: 'git_cochanges',
      description:
        'Identify files that frequently change in the same commits as a target file (coupling analysis). Use it to discover related code that may emit correlated log events.',
      hiddenParams: ['repository'],
      prepare: requireActiveRepository,
    },
    {
      sourceToolId: SCS_FILE_AUTHORS_TOOL_ID,
      name: 'git_file_authors',
      description:
        'Return an author contribution leaderboard for one or more files (commit counts, line stats, last commit). Use it to identify owners/subject-matter experts of a log site.',
      hiddenParams: ['repository'],
      prepare: requireActiveRepository,
    },
  ];

  const { tools: bridgedTools, callbacks: bridgedCallbacks } =
    await createInferenceToolsFromAgentBuilder({
      tools: agentBuilderTools,
      request,
      specs,
      logger,
    });

  // If not even the SCS workflow tools resolve, grounding is unavailable.
  if (Object.keys(bridgedTools).length === 0) {
    return undefined;
  }

  // `select_code_index` is not an SCS tool — it manages the active index and
  // resolves its repository, so it stays hand-written.
  const selectCodeIndexTool: ToolDefinition = {
    description:
      "Select the code index to ground subsequent code_search / read_code_file / analyze_symbol calls against. Choose the index whose repository produces this stream's logs, using the stream name, description, and dataset_analysis (service names, languages, dependency calls) to decide. Resolves the index's git repository so the git_* history tools become usable. If no index clearly matches the stream, do not select one and proceed without code grounding.",
    schema: {
      type: 'object',
      properties: {
        index: {
          type: 'string',
          description:
            'Exact code index name to activate, as returned by list_code_indices (e.g. "code-acme_checkout").',
        },
      },
      required: ['index'],
    },
  };

  const selectCodeIndexCallback: ToolCallback = async (toolCall) => {
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
  };

  const tools: Record<string, ToolDefinition> = {
    ...bridgedTools,
    select_code_index: selectCodeIndexTool,
  };
  const callbacks: Record<string, ToolCallback> = {
    ...bridgedCallbacks,
    select_code_index: selectCodeIndexCallback,
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
