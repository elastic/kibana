/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import dedent from 'dedent';
import {
  GITHUB_GET_COMMIT_TOOL_ID,
  GITHUB_GET_FILE_CONTENTS_TOOL_ID,
  GITHUB_ISSUE_PR_RESEARCH_SKILL_ID,
  GITHUB_ISSUE_READ_TOOL_ID,
  GITHUB_PULL_REQUEST_READ_TOOL_ID,
  GITHUB_SEARCH_CODE_TOOL_ID,
  GITHUB_SEARCH_ISSUES_TOOL_ID,
  GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID,
  GITHUB_SEARCH_REPOSITORIES_TOOL_ID,
} from '../../tools/github/constants';

export const githubIssuePrResearchSkill = defineSkillType({
  id: GITHUB_ISSUE_PR_RESEARCH_SKILL_ID,
  name: GITHUB_ISSUE_PR_RESEARCH_SKILL_ID,
  basePath: 'skills/platform/agent-builder',
  description:
    'Research GitHub issues, pull requests, implementation history, and design intent. Load when the user asks why code changed, whether work is tracked, which PR implemented something, what alternatives were discussed, or to find related issues and PRs.',
  content: dedent(`
    Research implementation history and intent through GitHub issues and pull requests.

    - Use ${GITHUB_SEARCH_REPOSITORIES_TOOL_ID} if the repository is unknown.
    - Use ${GITHUB_SEARCH_ISSUES_TOOL_ID} for issues and ${GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID} for pull requests. Prefer repository-scoped searches when possible.
    - Use ${GITHUB_ISSUE_READ_TOOL_ID} and ${GITHUB_PULL_REQUEST_READ_TOOL_ID} to inspect details, comments, reviews, changed files, commits, and diffs.
    - Issues and PRs establish history, intent, proposals, and discussion. They do not prove current behavior.
    - For claims about current implementation, resolve the relevant revision with ${GITHUB_GET_COMMIT_TOOL_ID}, use ${GITHUB_SEARCH_CODE_TOOL_ID} only for candidate discovery, and verify with ${GITHUB_GET_FILE_CONTENTS_TOOL_ID} at the full SHA.
    - Clearly distinguish current behavior, historical behavior, and unimplemented proposals.
    - Cite issue and PR URLs for discussion; cite immutable source URLs for implementation claims.
    - All tools are read-only. Never claim to modify an issue or pull request.
  `),
  getRegistryTools: () => [
    GITHUB_SEARCH_REPOSITORIES_TOOL_ID,
    GITHUB_SEARCH_ISSUES_TOOL_ID,
    GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID,
    GITHUB_ISSUE_READ_TOOL_ID,
    GITHUB_PULL_REQUEST_READ_TOOL_ID,
    GITHUB_GET_COMMIT_TOOL_ID,
    GITHUB_SEARCH_CODE_TOOL_ID,
    GITHUB_GET_FILE_CONTENTS_TOOL_ID,
  ],
});
