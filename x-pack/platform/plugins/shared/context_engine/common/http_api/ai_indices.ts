/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImprovementAction } from './improvement_actions';

/**
 * The type of backing store an AI index is attached to. `index` covers a
 * concrete index name or an index pattern (e.g. `foo`, `foo,bar`, `foo*`).
 */
export type AiIndexType = 'data_stream' | 'index';

export interface AiIndexDest {
  type: AiIndexType;
  value: string;
}

export type AiIndexSourceType = 'esql' | 'connector';

export interface AiIndexSource {
  type: AiIndexSourceType;
  value: string;
}

export type AiIndexAutomationType = 'workflow';

export interface AiIndexAutomation {
  type: AiIndexAutomationType;
  value: string;
}

/**
 * Which signals the feedback analysis reads. A read filter only: it narrows the
 * `@timestamp` range the analysis selects over, and never deletes or retains
 * signals. `relative` is date math evaluated per run (`now-30d`); `absolute` is
 * an open-ended "since this ISO date".
 */
export type AiIndexSignalTimeRange =
  | { type: 'relative'; from: string }
  | { type: 'absolute'; from: string };

/**
 * Per-index control plane for the feedback loop: whether to analyze this
 * index's signals, with which agent, how often, and over what window.
 */
export interface AiIndexFeedbackAnalysis {
  /**
   * Desired state. The scheduler remains authoritative for whether analysis is
   * actually running, because a schedule also needs credentials bound to it.
   */
  enabled: boolean;
  /** Agent Builder agent to analyze with. */
  agent_id?: string;
  schedule?: { interval: string };
  signal_time_range?: AiIndexSignalTimeRange;
  /**
   * KQL narrowing which signals a run analyzes, applied on top of
   * `signal_time_range`. It belongs here rather than in the generation pipeline
   * because generation is global and stateful: every index reads the same
   * signals, and dropping a signal at write time would drop it for every
   * consumer, permanently.
   */
  signal_filter?: string;
  /**
   * Which improvement actions this index's analysis may propose. Prompting an
   * agent to stay away from an action does not stop it, so the allowed set is
   * config rather than instruction. An empty list is observe-only: the run
   * still reports what it found but may not propose a change.
   */
  allowed_actions?: ImprovementAction[];
}

export interface AiIndexProperties {
  description?: string;
  dest: AiIndexDest;
  automations: AiIndexAutomation[];
  sources: AiIndexSource[];
  feedback_analysis?: AiIndexFeedbackAnalysis;
}

/**
 * The analysis run in flight, or the last one to have finished.
 *
 * The conversation id is minted before the agent is started rather than read from its result, so
 * the run can be opened while it is happening. It is also what identifies the run: a slow run
 * finishing after a newer one began must not clear the newer one's marker.
 */
export interface AiIndexFeedbackRun {
  /** Agent Builder conversation the run writes into. */
  conversation_id: string;
  started_at: string;
  /** Absent while the run is in flight. */
  finished_at?: string;
  /** How many improvements the run recorded. Set when it finishes. */
  recorded?: number;
}

/**
 * How long a run may go without finishing before it is presumed dead.
 *
 * A run marks itself finished when it records what it proposed, so a run that errors or times out
 * leaves its marker behind. Matches the analysis step's own timeout.
 */
export const FEEDBACK_RUN_STALE_AFTER_MS = 30 * 60 * 1000;

/** Whether the run is still going, as opposed to finished or abandoned. */
export const isFeedbackRunActive = (
  run: AiIndexFeedbackRun | undefined,
  now: number = Date.now()
): boolean => {
  if (!run || run.finished_at) {
    return false;
  }
  return now - new Date(run.started_at).getTime() < FEEDBACK_RUN_STALE_AFTER_MS;
};

export interface AiIndexHttpItem extends AiIndexProperties {
  id: string;
  managed: boolean;
  date_created: string;
  date_modified: string;
  /**
   * Written by the analysis workflow, not by the API: it is a record of what the loop is doing,
   * not something a caller configures. Read-only for that reason.
   */
  feedback_run?: AiIndexFeedbackRun;
}

export type GetAiIndexResponse = AiIndexHttpItem;

export interface ListAiIndexResponse {
  ai_indices: AiIndexHttpItem[];
}

export interface CreateAiIndexRequest extends AiIndexProperties {
  id: string;
}

export type PutAiIndexFeedbackAnalysisRequest = AiIndexFeedbackAnalysis;

export interface PutAiIndexFeedbackAnalysisResponse {
  /** The stored block with defaults resolved, so callers see what will actually run. */
  feedback_analysis: AiIndexFeedbackAnalysis;
}

export interface CreateAiIndexResponse {
  status: 'created';
}

export interface PutAiIndexResponse {
  status: 'created' | 'updated';
}

export interface DeleteAiIndexResponse {
  acknowledged: boolean;
}

export interface KiTypeCount {
  type: string;
  count: number;
}
