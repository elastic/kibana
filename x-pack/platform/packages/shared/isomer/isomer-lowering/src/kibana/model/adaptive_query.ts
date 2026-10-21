/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Host-executable query for a lowered Kibana panel.

export interface AdaptiveQuery {
  /**
   * ES|QL string with optional `?param` references resolved against `params`.
   */
  esql: string;
  /**
   * Parameters bound into the ES|QL string. Common entries:
   * - `_tstart` / `_tend`: ISO timestamps for the resolved time range.
   * - `_tz`: IANA timezone (optional).
   * Hosts may add custom params keyed by ES|QL parameter name.
   */
  params?: Record<string, string | number | boolean>;
  /**
   * Index pattern the query targets, for diagnostic and logging purposes.
   * Not used at execution time (ES|QL carries the source inline).
   */
  indexPattern?: string;
  /**
   * Hint about the shape of rows the host should expect after execution.
   * Used by `bindViewPlan` to validate inputs and to fall back to an empty
   * state when columns are missing.
   */
  expectedColumns?: ExpectedColumn[];
  /**
   * The source layer opted out of global filter context
   * (`FormBasedLayer.ignoreGlobalFilters`).
   *
   * Carried on the query rather than resolved at conversion time because the
   * dashboard predicates are injected later, by `planAdaptiveDashboard`, which
   * has no other way to know the panel asked to be left alone. Only filters
   * and queries are suppressed: the time range is a separate control in
   * Kibana and still applies.
   */
  ignoreGlobalFilters?: boolean;
  /**
   * A Discover session's own query and filters. The host applies them as DSL with the dashboard's context, as the
   * saved search embeddable does, rather than the converter translating them to ES|QL.
   */
  searchSource?: {
    query?: { query: string | Record<string, unknown>; language: string };
    filters?: Array<Record<string, unknown>>;
  };
}

export interface ExpectedColumn {
  /**
   * Column name as it appears in the ES|QL result.
   */
  name: string;
  /**
   * Coarse type used for binding. ES|QL row values arrive as JSON primitives;
   * the binder uses this hint when coercing.
   */
  type: 'string' | 'number' | 'date';
}

/**
 * A time range bound to a query. Resolved by the host before query execution;
 * the converter records the source (e.g. dashboard time picker, panel
 * override) but never freezes a timestamp itself unless one was already
 * baked into the Lens panel.
 */
export interface TimeRange {
  /**
   * ISO timestamp or relative expression (e.g. `now-24h`).
   */
  from: string;
  /**
   * ISO timestamp or relative expression (e.g. `now`).
   */
  to: string;
  /**
   * IANA timezone (e.g. `UTC`, `America/New_York`).
   */
  timezone?: string;
}

/**
 * A filter applied to a query. Phrase/phrases and kuery lower to `esql`;
 * the dashboard planner injects those predicates into each panel `WHERE`.
 * `kql`/`lucene` stay for diagnostic provenance when the query cannot be
 * lowered.
 */
export interface Filter {
  esql?: string;
  kql?: string;
  lucene?: string;
  label?: string;
}
