/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const publicApiPath = '/api/context_engine';
export const internalApiPath = '/internal/context_engine';

export const aiIndexPath = `${publicApiPath}/ai_index`;
export const aiIndexByIdPath = `${aiIndexPath}/{aiIndexId}`;
export const aiIndexKiSummaryPath = `${internalApiPath}/ai_index/{aiIndexId}/ki_summary`;

/** Read-only Signals routes (internal): a preaggregated grouped list and a per-group fetch. */
export const signalGroupsPath = `${internalApiPath}/signals/groups`;
export const signalsPath = `${internalApiPath}/signals`;

/** Version of the internal Signals API, shared between route registration and the browser client. */
export const SIGNALS_INTERNAL_API_VERSION = '1';

/** Max number of tag groups returned by the grouped Signals list. */
export const MAX_SIGNAL_GROUPS = 100;

/** Default and maximum page size when fetching the individual signals in a group. */
export const DEFAULT_SIGNALS_PAGE_SIZE = 25;
export const MAX_SIGNALS_PAGE_SIZE = 100;

/** Improvements routes (internal): list per AI index, record a run's output, approve, reject. */
export const improvementsPath = `${internalApiPath}/improvements`;
export const improvementApprovePath = `${improvementsPath}/{improvementId}/_approve`;
export const improvementRejectPath = `${improvementsPath}/{improvementId}/_reject`;
export const aiIndexImprovementsPath = `${internalApiPath}/ai_index/{aiIndexId}/improvements`;

/** Feedback-loop routes (internal): the agent context payload, a manual run, and the schedule. */
export const aiIndexFeedbackContextPath = `${internalApiPath}/ai_index/{aiIndexId}/feedback_context`;
export const aiIndexFeedbackRunPath = `${internalApiPath}/ai_index/{aiIndexId}/feedback_loop/_run`;
export const aiIndexFeedbackSchedulePath = `${internalApiPath}/ai_index/{aiIndexId}/feedback_loop/schedule`;

/**
 * Version of the internal Improvements and feedback-loop APIs, shared between route registration
 * and the browser client.
 */
export const IMPROVEMENTS_INTERNAL_API_VERSION = '1';

/** Default and maximum page size when listing improvements. */
export const DEFAULT_IMPROVEMENTS_PAGE_SIZE = 25;
export const MAX_IMPROVEMENTS_PAGE_SIZE = 100;

/**
 * Max number of improvements handed to the agent as prior history. Bounds the prompt while still
 * covering enough past decisions for the agent to avoid re-proposing.
 */
export const MAX_IMPROVEMENT_HISTORY = 200;

/** Max number of suggestions accepted from a single feedback-loop run. */
export const MAX_IMPROVEMENTS_PER_RUN = 20;

export const MAX_IMPROVEMENT_TITLE_LENGTH = 512;
export const MAX_IMPROVEMENT_RATIONALE_LENGTH = 4096;
export const MAX_IMPROVEMENT_ID_LENGTH = 256;
export const MAX_IMPROVEMENT_WORKFLOW_YAML_LENGTH = 65536;
export const MAX_IMPROVEMENT_KI_CONTENT_LENGTH = 32768;
export const MAX_IMPROVEMENT_TAGS = 32;

/**
 * Version of the public AI index API, shared between the server route
 * registration and browser clients.
 */
export const AI_INDEX_API_VERSION = '2023-10-31';

/**
 * Version of internal Context Engine AI index routes.
 */
export const AI_INDEX_INTERNAL_API_VERSION = '1';

/**
 * Backing data streams and indices follow type-specific naming conventions,
 * both sharing the common `ai-index-` base.
 */
export const AI_INDEX_DEST_PREFIX = 'ai-index-';
export const AI_INDEX_DATA_STREAM_PREFIX = `${AI_INDEX_DEST_PREFIX}ds-`;
export const AI_INDEX_INDEX_PREFIX = `${AI_INDEX_DEST_PREFIX}idx-`;

/**
 * Hard limit on the number of AI indices returned by the list API.
 * TODO: Remove this limit (or make it configurable) and add pagination support to List API.
 */
export const MAX_AI_INDICES = 100;

export const MAX_AI_INDEX_ID_LENGTH = 256;
export const MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH = 256;
export const MAX_AI_INDEX_DESCRIPTION_LENGTH = 2048;
export const MAX_AI_INDEX_DEST_VALUE_LENGTH = 1024;
export const MAX_INDEX_NAME_BYTES = 255;
export const MAX_AI_INDEX_AUTOMATION_LENGTH = 1024;
export const MAX_AI_INDEX_SOURCE_VALUE_LENGTH = 10240;
export const MAX_AI_INDEX_AUTOMATIONS = 100;
export const MAX_AI_INDEX_SOURCES = 100;

/** Advanced setting that gates the Context Engine feedback loop. */
export const CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID = 'contextEngine:feedbackLoopEnabled';

/** Task Manager type, id, and schedule for the global signal-generation task. */
export const SIGNAL_GENERATOR_TASK_TYPE = 'contextEngine:signalGenerator';
export const SIGNAL_GENERATOR_TASK_ID = 'contextengine-signal-generator';
export const SIGNAL_GENERATOR_SCHEDULE_INTERVAL = '1h';

/** Agent id whose tool calls are left untagged. */
export const MANAGEMENT_AGENT_ID = 'platform.context_engine.agent';

/**
 * Built-in Agent Builder agent that analyzes signals and proposes improvements. Used whenever an
 * AI index has no `feedback_agent_id` of its own. Registered by `context_engine_agent_builder`,
 * which owns the Agent Builder dependency; declared here so both plugins agree on the id.
 */
export const CONTEXT_ENGINE_FEEDBACK_AGENT_ID = 'platform.context_engine.feedback_loop';

/**
 * How often a scheduled feedback loop runs, in minutes. Daily: signals accumulate slowly, and a
 * run costs an LLM analysis and produces suggestions a human has to review, so a shorter cadence
 * would mostly re-read the same evidence and re-propose what is still awaiting review.
 */
export const FEEDBACK_LOOP_SCHEDULE_INTERVAL_MINUTES = 1440;

/** The plugin id the improvement-loop managed workflow is owned by. */
export const CONTEXT_ENGINE_PLUGIN_ID = 'contextEngine';

/**
 * Prefix for the per-space Agent Builder OTel traces indices (one per Kibana space). Kept
 * in-plugin — mirrors Agent Builder's exported `buildAgentBuilderTracesIndexPattern` contract —
 * so Context Engine does not take a dependency on `@kbn/agent-builder-plugin`.
 */
export const AGENT_BUILDER_TRACES_INDEX_PREFIX = 'traces-agent_builder.otel-';

/** The Agent Builder OTel traces index name for a given Kibana space. */
export const buildAgentBuilderTracesIndexName = (spaceId: string): string =>
  `${AGENT_BUILDER_TRACES_INDEX_PREFIX}${spaceId}`;
