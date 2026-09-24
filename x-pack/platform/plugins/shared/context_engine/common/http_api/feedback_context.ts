/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalTag } from './signals';

/**
 * One recurring shape in an AI index's signals: a classifier tag seen repeatedly against the same
 * target index through the same tool.
 */
export interface SignalPatternGroup {
  /** The classifier tag that defines the group. */
  tag: SignalTag;
  /** The index expression the failing queries named. */
  target_index: string;
  /** The tool that ran them. */
  tool: string;
  /** How many selected signals fall in this group. */
  count: number;
  /** Ranking weight: {@link count} scaled by how strongly the tag indicates a fixable problem. */
  score: number;
  /** A capped sample of the group's signal ids, for provenance. */
  signal_ids: string[];
  /** One representative signal, carrying its query and error text. */
  example?: {
    query?: string;
    error?: string;
    row_count: number;
    conversation_id?: string;
  };
}

/** The window and spaces a run analyzed, echoed back when it records what it proposed. */
export interface FeedbackAnalysisRunContext {
  /** The window the signals were read from, resolved at selection time. */
  signal_window: { from: string; to: string };
  /** Spaces the selected signals came from. */
  signal_spaces: string[];
  /** How many signals were selected. */
  signal_count: number;
}

/**
 * Everything one analysis run needs, assembled server-side and handed to the run by the
 * `context-engine.getFeedbackContext` workflow step.
 */
export interface FeedbackAnalysisContext {
  /** `feedback_analysis.agent_id` when set, otherwise the default Elastic agent. */
  agent_id: string;
  run: FeedbackAnalysisRunContext;
  /** The rendered prompt, ready to hand to the agent as its message. */
  briefing: string;
  /** JSON Schema for the agent's structured output, narrowed to the index's allowed actions. */
  output_schema: Record<string, unknown>;
  /** False when the window held nothing to analyze. */
  has_signals: boolean;
}
