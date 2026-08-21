/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A single step in the agent's reasoning + tool-call trace. */
export interface TraceStep {
  type: 'reasoning' | 'tool' | 'skill';
  /** Reasoning text (for `type: 'reasoning'`). */
  text?: string;
  /** Tool call ID (for `type: 'tool'`). */
  toolId?: string;
  /** Tool call parameters (for `type: 'tool'`). */
  toolParams?: string;
  /** Skill IDs selected (for `type: 'skill'`). */
  skills?: string[];
}

/** Trace data for a single (model, column) pair. */
export interface MatrixTraceEntry {
  /** The initial user question from the eval dataset. */
  question?: string;
  /** Ordered list of tool IDs the agent called. */
  toolTrail?: string[];
  /** The agent's final answer (markdown). */
  answer?: string;
  /** Full reasoning + tool-call step trace. */
  steps?: TraceStep[];
  /** Number of steps (cached for summary table). */
  stepCount?: number;
  /** Number of tool calls (cached for summary table). */
  toolCount?: number;
  /**
   * Per-evaluator mean scores for this example within the experiment
   * (evaluator name → mean over repetitions). Lets the report render a
   * per-prompt score instead of repeating the column aggregate on every card.
   */
  scores?: Record<string, number>;
  /** Number of repetitions aggregated into this entry's scores. */
  repetitions?: number;
}

/**
 * Map of trace entries keyed by `${modelId}:${columnId}`.
 * Lookups use the same model/column IDs as the matrix config.
 */
export type MatrixTraceData = Record<string, MatrixTraceEntry>;

/** Build the trace-data lookup key. */
export const traceKey = (modelId: string, columnId: string): string => `${modelId}:${columnId}`;
