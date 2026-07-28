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
  GITHUB_GET_REPOSITORY_TREE_TOOL_ID,
  GITHUB_KI_DISCOVERY_SKILL_ID,
  GITHUB_LIST_REPOS_TOOL_ID,
  GITHUB_SEARCH_CODE_TOOL_ID,
} from '../../tools/github/constants';

export const githubKiDiscoverySkill = defineSkillType({
  id: GITHUB_KI_DISCOVERY_SKILL_ID,
  name: GITHUB_KI_DISCOVERY_SKILL_ID,
  basePath: 'skills/platform/agent-builder',
  description:
    'Workflow-only GitHub source investigation for Significant Events Knowledge Indicator extraction. Load only when a workflow explicitly requests this skill. Discovers deployable services or production logging sites and returns the requested structured output.',
  content: dedent(`
    Perform the workflow task exactly and return only the requested structured output.

    Common rules:
    - Use ${GITHUB_LIST_REPOS_TOOL_ID} only for SERVICE_DISCOVERY. LOGGING_SITES receives an explicit repository, SHA, and service root.
    - Resolve configured refs with ${GITHUB_GET_COMMIT_TOOL_ID}. Pass the bare ref exactly as configured; never prepend refs/heads/ or refs/tags/.
    - Use the resulting full commit SHA for every ${GITHUB_GET_REPOSITORY_TREE_TOOL_ID} and ${GITHUB_GET_FILE_CONTENTS_TOOL_ID} call.
    - Prefer tree and pinned file reads. Use ${GITHUB_SEARCH_CODE_TOOL_ID} only when necessary; it is limited to 10 requests per minute per API key.
    - For SERVICE_DISCOVERY searches pass phase="service-discovery". For LOGGING_SITES searches pass phase="logging-sites" and the supplied serviceName.
    - GitHub search is not pinned and is never final evidence. Verify every result with a pinned file read.
    - Never use issue or pull-request tools during KI discovery.
    - Never invent repositories, SHAs, paths, service names, logging calls, messages, or metadata. Omit unknown optional fields.

    SERVICE_DISCOVERY:
    - Discover every independently deployable application in each configured repository.
    - Exclude libraries, shared packages, tests, examples, generated code, and config-only directories.
    - Return service roots, emitted service.name values, languages, repository classification evidence, deployment evidence, versions, and telemetry metadata.

    LOGGING_SITES:
    - Stay within the supplied service root.
    - Find production logger calls and static message templates.
    - Exclude tests, examples, and generated code.
    - Return concise, deduplicated source excerpts centered on verified logging calls.
  `),
  getRegistryTools: () => [
    GITHUB_LIST_REPOS_TOOL_ID,
    GITHUB_SEARCH_CODE_TOOL_ID,
    GITHUB_GET_COMMIT_TOOL_ID,
    GITHUB_GET_REPOSITORY_TREE_TOOL_ID,
    GITHUB_GET_FILE_CONTENTS_TOOL_ID,
  ],
});
