/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID } from '../../tools/validate_logging_queries/tool';
import instructions from './instructions/logging_wrappers.md.text';

/**
 * Agent Builder agent that investigates a repository's house logging wrappers
 * and returns validated Lucene RLIKE greps matching their call sites. Runs in the
 * INDEXING path (the code-extraction workflow's gated `ai.agent` step), never in
 * the query path.
 *
 * The `agent-id` literal in `code_extraction.yaml` must be kept in sync with this
 * value (YAML cannot import a TS constant).
 */
export const SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_ID = 'significant-events.logging-wrappers';
export const SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID =
  'platform.sig_events.logging-wrappers-type';

/**
 * Codebox git tools the wrapper investigator needs to survey the repository.
 * These IDs are registered by the Codebox Agent Builder provisioner
 * (`codebox install.ts`); the workflow-backed tools call the Codebox HTTP API.
 */
const CODEBOX_GREP_TOOL_ID = 'git-grep';
const CODEBOX_SHOW_TOOL_ID = 'git-show';
const CODEBOX_LS_TREE_TOOL_ID = 'git-ls-tree';

export const loggingWrappersAgentType = {
  id: SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID,
  name: 'Logging Wrapper Investigator',
  description:
    'Investigates a repository to find the house logging wrappers (functions/macros the repo defines so other code can log without naming a logger), writes Lucene RLIKE greps matching their call sites, validates each against the indexed commit, and returns the validated greps (or an empty list when the repository has no house wrapper).',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions,
    skill_ids: [],
    // The tool set is fully explicit: only the read-only Sourcerer code tools plus
    // the validate_logging_queries builtin. Elastic capabilities are irrelevant to
    // wrapper investigation, so they stay disabled.
    enable_elastic_capabilities: false,
    connector_ids: [],
    tools: [
      {
        tool_ids: [
          CODEBOX_GREP_TOOL_ID,
          CODEBOX_SHOW_TOOL_ID,
          CODEBOX_LS_TREE_TOOL_ID,
          SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID,
        ],
      },
    ],
  },
} as const satisfies AgentTypeDefinition;

export const registerLoggingWrappersAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(loggingWrappersAgentType);
};
