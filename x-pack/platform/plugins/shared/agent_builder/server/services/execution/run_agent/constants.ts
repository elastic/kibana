/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common';

// check for background executions and other background work every X agent cycles.
export const BACKGROUND_CHECK_CYCLE_INTERVAL = 3;

// Context management triggers, relative to the connector's context window.
export const INTRA_ROUND_COMPACTION_FRACTION = 0.8;
export const INTRA_ROUND_SUBSTITUTION_FRACTION = 0.5;
export const INTRA_ROUND_SUBSTITUTION_MAX_TOKENS = 100_000;

// Per-result substitution thresholds (filestore entry token count).
export const SUBST_ROUND_START_THRESHOLD_COLD = 1_000;
export const SUBST_ROUND_START_THRESHOLD_HOT = 10_000;
export const SUBST_INTRA_ROUND_THRESHOLD = 1_000;

// Compaction preserved tail.
export const COMPACTION_TAIL_HARD_CAP_TOKENS = 40_000;
export const COMPACTION_TAIL_HARD_CAP_TOKENS_REACTIVE = 20_000;
export const COMPACTION_TAIL_FLOOR_TOKENS = 10_000;

// Cadence / safety.
export const CONTEXT_MANAGEMENT_COOLDOWN_CYCLES = 5;
export const CACHE_FRESHNESS_FALLBACK_SECONDS = 300;
export const MAX_CONTEXT_RETRY_COUNT = 1;

/**
 * Tools that have their own dedicated step lifecycle event and therefore should NOT produce a default `toolCallEvent`.
 */
export const TOOLS_WITH_DEDICATED_STEP_LIFECYCLE: ReadonlySet<string> = new Set([
  internalTools.askUserQuestion,
]);

export const steps = {
  init: 'init',
  checkBackgroundWork: 'checkBackgroundWork',
  contextManagement: 'contextManagement',
  compactContext: 'compactContext',
  researchAgent: 'researchAgent',
  executeTool: 'executeTool',
  handleToolInterrupt: 'handleToolInterrupt',
  prepareToAnswer: 'prepareToAnswer',
  answerAgent: 'answerAgent',
  finalize: 'finalize',
};

export const tags = {
  agent: 'agent',
  researchAgent: 'research-agent',
  answerAgent: 'answer-agent',
};

export const BROWSER_TOOL_PREFIX = 'browser_';
