/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem, KiTypeCount } from './ai_indices';
import type { ImprovementEnvelope } from './improvements';
import type { SignalGroup } from './signals';

/**
 * Everything the feedback agent is given about an AI index on a run. Served by a single route so
 * the scheduled workflow (via a `kibana.request` step) and the interactive "Analyze & improve"
 * hand-off cannot drift apart.
 */
export interface FeedbackContext {
  /** The index's own configuration: dest, sources, linked automations, feedback agent. */
  ai_index: AiIndexHttpItem;
  ki_summary: {
    count: number;
    counts_by_type: KiTypeCount[];
  };
  /** Signal counts grouped by classification tag. */
  signal_groups: SignalGroup[];
  /**
   * Every improvement ever suggested for this index, including rejected ones, so the agent does
   * not re-propose what has already been refused or applied.
   */
  improvements: ImprovementEnvelope[];
  /** The signals index for the active space, so the agent can drill into evidence with ES|QL. */
  signals_index: string;
  /** The agent that will run the analysis: the index's own, or the built-in default. */
  agent_id: string;
  /**
   * The above rendered as the task briefing handed to the agent. Served alongside the structured
   * fields so the workflow can pass a single string to its `ai.agent` step instead of templating
   * the payload in YAML, and so the interactive hand-off says exactly the same thing.
   */
  prompt: string;
}

export type GetFeedbackContextResponse = FeedbackContext;

export interface RunFeedbackLoopResponse {
  /** Workflow execution id, for polling the run's progress. */
  execution_id: string;
}

/** Body of the schedule route. */
export interface PutFeedbackScheduleRequest {
  enabled: boolean;
}

export interface FeedbackScheduleStatus {
  /** Whether the scheduled analysis is currently running for this AI index. */
  enabled: boolean;
  /** Id of the workflow backing this index's schedule, once installed. */
  workflow_id?: string;
}

export type PutFeedbackScheduleResponse = FeedbackScheduleStatus;

export type GetFeedbackScheduleResponse = FeedbackScheduleStatus;
