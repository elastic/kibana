/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ids for the Context Engine's Agent Builder data-access surface (the feedback
 * loop's hand-off to Agent Builder).
 *
 * Plain string constants only — this file must never import from Agent Builder
 * (`@kbn/agent-builder-*`, the `agentBuilder` plugin). The ids are registered
 * against the real Agent Builder types downstream in `server/agent_builder/`
 * (by `registerContextEngineAgentBuilder`, called from `agent_builder_platform`)
 * and mirrored in `agent-builder-server`'s `allow_lists.ts`.
 *
 * There is no Context Engine built-in agent or skills here: the analysis agent
 * is the user's own (selected per AI index via `feedback_agent_id`). This module
 * ships only the neutral `ai_index` attachment + its read-only bounded tool.
 */

/** Attachment payload = an `AiIndexHttpItem`; grants only `get_ai_index_automations`. */
export const AI_INDEX_ATTACHMENT_TYPE = 'platform.context_engine.ai_index';

/** Bounded read tool exposed by the `ai_index` attachment (reads linked workflow YAML). */
export const GET_AI_INDEX_AUTOMATIONS_TOOL_ID = 'platform.context_engine.get_ai_index_automations';
