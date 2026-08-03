/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Attachment type carrying an AI index into a management-agent conversation.
 * Must stay in sync with `AGENT_BUILDER_BUILTIN_ATTACHMENTS`.
 */
export const AI_INDEX_ATTACHMENT_TYPE = 'platform.context_engine.ai_index';

/**
 * Attachment type carrying a detected failure pattern into a management-agent
 * conversation, so the agent can propose an improvement.
 * Must stay in sync with `AGENT_BUILDER_BUILTIN_ATTACHMENTS`.
 */
export const PATTERN_ATTACHMENT_TYPE = 'platform.context_engine.pattern';

/**
 * Attachment type carrying a single failing case (one retrieval/tool event) into a
 * conversation, so the agent can pull its originating trace and help fix the issue.
 * Must stay in sync with `AGENT_BUILDER_BUILTIN_ATTACHMENTS`.
 */
export const CASE_ATTACHMENT_TYPE = 'platform.context_engine.case';

/**
 * The management agent: authors the automations that build KIs and proposes
 * improvements for detected patterns. Must stay in sync with `AGENT_BUILDER_BUILTIN_AGENTS`.
 */
export const CONTEXT_ENGINE_AGENT_ID = 'platform.context_engine.agent';

/** Skill teaching the agent to turn declared sources into KI-creation automations. */
export const CONTEXT_ENGINE_SETUP_SKILL_ID = 'context-engine-setup';

/** Skill teaching the agent to resolve a failure pattern into a concrete improvement. */
export const PROPOSE_IMPROVEMENT_SKILL_ID = 'propose-improvement';

/**
 * Tool ids for the Context Engine management tools, in the `platform.context_engine`
 * namespace. Defined here (not in `@kbn/agent-builder-common`) so the ids live with
 * the plugin that owns the tools.
 */
export const contextEngineToolIds = {
  getAiIndex: 'platform.context_engine.get_ai_index',
  updateAiIndex: 'platform.context_engine.update_ai_index',
  saveAutomation: 'platform.context_engine.save_automation',
} as const;
