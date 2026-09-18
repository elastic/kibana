/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder tool IDs installed by Semantic Code Search (SCS) via
 * `scs install-agentic-interfaces`, registered under `scs.<workflow_name>`.
 */
export const SCS_SEMANTIC_SEARCH_TOOL_ID = 'scs.semantic_search';
export const SCS_READ_FILE_TOOL_ID = 'scs.read_file_from_chunks';
export const SCS_SYMBOL_ANALYSIS_TOOL_ID = 'scs.symbol_analysis';
export const SCS_LIST_REPOS_TOOL_ID = 'scs.list_repos';
// Removed from SCS in https://github.com/elastic/semantic-code-search/pull/147; kept only for
// the `compute_code_analysis` fallback.
export const SCS_LIST_INDICES_TOOL_ID = 'scs.list_indices';
export const SCS_FILE_HISTORY_TOOL_ID = 'scs.get_file_history';
export const SCS_GET_COMMIT_TOOL_ID = 'scs.get_commit';
export const SCS_FIND_INTRODUCING_COMMIT_TOOL_ID = 'scs.find_introducing_commit';
export const SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID = 'scs.search_commit_messages';
export const SCS_COCHANGES_TOOL_ID = 'scs.get_cochanges';
export const SCS_FILE_AUTHORS_TOOL_ID = 'scs.get_file_authors';

/** SCS tools exposed to the KI query generation agent; all are `repository`-addressed. */
export const SCS_AGENT_BUILDER_TOOL_IDS = [
  SCS_LIST_REPOS_TOOL_ID,
  SCS_SEMANTIC_SEARCH_TOOL_ID,
  SCS_READ_FILE_TOOL_ID,
  SCS_SYMBOL_ANALYSIS_TOOL_ID,
  SCS_SEARCH_COMMIT_MESSAGES_TOOL_ID,
  SCS_FIND_INTRODUCING_COMMIT_TOOL_ID,
  SCS_FILE_HISTORY_TOOL_ID,
  SCS_GET_COMMIT_TOOL_ID,
  SCS_COCHANGES_TOOL_ID,
  SCS_FILE_AUTHORS_TOOL_ID,
] as const;
