/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One recurring shape in an AI index's signals: a classifier tag seen repeatedly against the same
 * target index through the same tool.
 *
 * This is the "pattern" of Stage 3 folded into Stage 2 — there is no patterns store yet, so a
 * group lives only as long as the run that computed it, and survives afterwards only as the
 * `tags` and `signal_ids` recorded in an improvement's provenance.
 */
export interface SignalPatternGroup {
  /** The classifier tag that defines the group (`query_error` / `empty_retrieval` / `coverage_gap`). */
  tag: string;
  /** The index expression the failing queries named. */
  target_index: string;
  /** The tool that ran them. */
  tool: string;
  /** How many selected signals fall in this group. */
  count: number;
  /** Ranking weight: {@link count} scaled by how strongly the tag indicates a fixable problem. */
  score: number;
  /** A sample of the group's signal ids, for provenance. Capped — a busy group has thousands. */
  signal_ids: string[];
  /** One representative signal, so the agent can see the actual query and error text. */
  example?: {
    query?: string;
    error?: string;
    row_count: number;
    conversation_id?: string;
  };
}

/** The window and spaces a run analyzed, echoed back when it records what it proposed. */
export interface FeedbackAnalysisRunContext {
  /** Resolved at selection time: relative date math is evaluated once, not per query. */
  signal_window: { from: string; to: string };
  /** Spaces the selected signals came from. */
  signal_spaces: string[];
  /** How many signals were selected. */
  signal_count: number;
}

/**
 * Everything one analysis run needs, assembled server-side and handed to the run by the
 * `context-engine.getFeedbackContext` workflow step.
 *
 * Deliberately narrow: the groups, KI summary and prior improvements a run reasons about are
 * already rendered into {@link briefing}, so carrying them separately would push the same content
 * through the workflow engine twice.
 */
export interface FeedbackAnalysisContext {
  /** `feedback_analysis.agent_id` when set, otherwise the default Elastic agent. */
  agent_id: string;
  run: FeedbackAnalysisRunContext;
  /** The rendered prompt, ready to hand to the agent as its message. */
  briefing: string;
  /** JSON Schema for the agent's structured output, narrowed to the index's allowed actions. */
  output_schema: Record<string, unknown>;
  /** False when the window held nothing to analyze, so a run can exit before spending an LLM call. */
  has_signals: boolean;
}
