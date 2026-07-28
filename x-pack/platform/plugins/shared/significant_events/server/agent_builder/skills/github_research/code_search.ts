/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import dedent from 'dedent';
import {
  GITHUB_CODE_SEARCH_SKILL_ID,
  GITHUB_GET_COMMIT_TOOL_ID,
  GITHUB_GET_FILE_CONTENTS_TOOL_ID,
  GITHUB_GET_REPOSITORY_TREE_TOOL_ID,
  GITHUB_SEARCH_CODE_TOOL_ID,
  GITHUB_SEARCH_REPOSITORIES_TOOL_ID,
} from '../../tools/github/constants';

export const githubCodeSearchSkill = defineSkillType({
  id: GITHUB_CODE_SEARCH_SKILL_ID,
  name: GITHUB_CODE_SEARCH_SKILL_ID,
  basePath: 'skills/platform/agent-builder',
  description:
    'Research current source code in GitHub. Load when the user asks to find a repository, locate code, explain an implementation, inspect a symbol or file, or compare source behavior. Use immutable revisions and verify search hits with pinned file reads.',
  content: dedent(`
    Research current source code in GitHub.

    - Use ${GITHUB_SEARCH_REPOSITORIES_TOOL_ID} when the repository is unknown or the user asks to discover projects or examples.
    - Do not call github.list_repos unless the user explicitly asks about repositories configured for KI extraction.
    - When the user supplies a branch or tag, resolve it with ${GITHUB_GET_COMMIT_TOOL_ID}. Pass the bare value exactly; never prepend refs/heads/ or refs/tags/.
    - Use ${GITHUB_GET_REPOSITORY_TREE_TOOL_ID} and ${GITHUB_GET_FILE_CONTENTS_TOOL_ID} before broad searches when paths are known.
    - Use ${GITHUB_SEARCH_CODE_TOOL_ID} only to discover candidate paths. Always scope it to a repository when one is known. It is limited to 10 requests per minute per API key.
    - GitHub code search is not pinned. Verify every implementation claim with ${GITHUB_GET_FILE_CONTENTS_TOOL_ID} at the full commit SHA.
    - Cite current behavior with immutable GitHub blob URLs containing the full SHA and precise line anchors when available.
    - Be concise. State when source evidence is insufficient rather than guessing.
  `),
  getRegistryTools: () => [
    GITHUB_SEARCH_REPOSITORIES_TOOL_ID,
    GITHUB_SEARCH_CODE_TOOL_ID,
    GITHUB_GET_COMMIT_TOOL_ID,
    GITHUB_GET_REPOSITORY_TREE_TOOL_ID,
    GITHUB_GET_FILE_CONTENTS_TOOL_ID,
  ],
});
