/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GITHUB_MCP_CONNECTOR_ID = 'github-mcp';
export const GITHUB_CODE_RESEARCHER_AGENT_ID = 'github.code_researcher';

export const GITHUB_LIST_REPOS_TOOL_ID = 'github.list_repos';
export const GITHUB_SEARCH_CODE_TOOL_ID = 'github.search_code';
export const GITHUB_GET_COMMIT_TOOL_ID = 'github.get_commit';
export const GITHUB_GET_REPOSITORY_TREE_TOOL_ID = 'github.get_repository_tree';
export const GITHUB_GET_FILE_CONTENTS_TOOL_ID = 'github.get_file_contents';
export const GITHUB_SEARCH_REPOSITORIES_TOOL_ID = 'github.search_repositories';
export const GITHUB_SEARCH_ISSUES_TOOL_ID = 'github.search_issues';
export const GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID = 'github.search_pull_requests';
export const GITHUB_ISSUE_READ_TOOL_ID = 'github.issue_read';
export const GITHUB_PULL_REQUEST_READ_TOOL_ID = 'github.pull_request_read';

export const GITHUB_CODE_SEARCH_SKILL_ID = 'github-code-search';
export const GITHUB_ISSUE_PR_RESEARCH_SKILL_ID = 'github-issue-pr-research';
export const GITHUB_KI_DISCOVERY_SKILL_ID = 'github-ki-discovery';
export const GITHUB_RESEARCH_SKILL_IDS = [
  GITHUB_CODE_SEARCH_SKILL_ID,
  GITHUB_ISSUE_PR_RESEARCH_SKILL_ID,
  GITHUB_KI_DISCOVERY_SKILL_ID,
] as const;

export const GITHUB_MCP_TOOL_NAMES = [
  'search_code',
  'get_commit',
  'get_repository_tree',
  'get_file_contents',
  'search_repositories',
  'search_issues',
  'search_pull_requests',
  'issue_read',
  'pull_request_read',
] as const;
