/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewSpec } from '../adaptive_nodes';
import type { AdaptiveChart, PrimitiveRenderHints } from '../model/adaptive_lens';
import type { AdaptiveQuery } from '../model/adaptive_query';
import type { ValueFormatter } from '../model/formatter';
import type { ReductionPolicy } from '../model/reductions';
import type { Reference } from '../model/references';

// A ViewPlan is the converter's output before any data is fetched. It
// carries:
// - `spec`: a fully-valid ViewSpec whose data-bearing body slots are
//   "loading" placeholders for data-bearing body slots.
// - `queries`: the ES|QL the host must execute. Each entry has a stable id.
// - `bindings`: maps each query to the body slot in `spec` that will be
//   replaced once data arrives. We use a sibling map rather than per-node
//   meta so primitive schemas stay untouched.
// - `diagnostics`: every lossy decision the converter made.
//
// `bindViewPlan(plan, dataTables)` walks the bindings, builds a real chart
// node from each data table, and returns the final renderable spec.

export interface ViewPlan {
  spec: ViewSpec;
  queries: ViewPlanQuery[];
  bindings: ViewPlanBinding[];
  diagnostics: ViewPlanDiagnostic[];
}

export interface ViewPlanQuery {
  /**
   * Stable id matched by value against {@link ViewPlanBinding.queryId} and
   * the `queryId` of each `DataTable` passed to {@link bindViewPlan}. Plans
   * may also include auxiliary queries (e.g. metric trend) with no
   * corresponding binding, so id-by-value — not array index — is the
   * canonical join.
   */
  id: string;
  query: AdaptiveQuery;
  /**
   * The chart shape this query feeds. Carried in the plan so `bindViewPlan`
   * can construct the right primitive without re-deriving from the spec.
   */
  chart: AdaptiveChart;
  /**
   * Optional human-readable label, used when no title was supplied.
   */
  label?: string;
  /**
   * Chart-wide numeric formatter (percent, bytes, duration, …). The binder
   * applies it to single-value primitives such as `metric`/`gauge` so the
   * rendered value matches the dashboard author's intent. Per-column
   * formatters live on `AdaptiveDatatableChart.columns[].format`.
   */
  format?: ValueFormatter;
  reductions?: ReductionPolicy;
  rendering?: PrimitiveRenderHints;
}

/**
 * A path into `spec.body` identifying a placeholder node to replace.
 *
 * Examples:
 * - `[0]` — `spec.body[0]`.
 * - `[2, 'items', 1, 'node']` — `spec.body[2].items[1].node`
 *   (`row` or `dashboardGrid` item).
 *
 * Path segments are pre-resolved strings/numbers so the binder doesn't have
 * to parse anything at runtime.
 */
export type BodyPath = ReadonlyArray<string | number>;

export interface ViewPlanBinding {
  /**
   * Matches a `ViewPlanQuery.id` and a `DataTable.queryId` at bind time.
   */
  queryId: string;
  specPath: BodyPath;
  /**
   * The chart shape that this binding produces. Same as `query.chart` but
   * convenient when walking bindings without joining against queries.
   */
  chart: AdaptiveChart;
  auxiliaryQueryIds?: {
    trend?: string;
  };
  references?: Reference[];
  reductions?: ReductionPolicy;
  rendering?: PrimitiveRenderHints;
}

export type ViewPlanDiagnosticLevel = 'info' | 'warn' | 'error';

export interface ViewPlanDiagnostic {
  level: ViewPlanDiagnosticLevel;
  /**
   * Stable machine-readable code (e.g. `'lens.searchSource.lowered-to-esql'`,
   * `'lens.xy.dropped-secondary-axis'`). Tests assert on `code`, never on
   * `message`.
   */
  code: string;
  message: string;
  /**
   * Panel id (saved-object id), when the diagnostic is panel-scoped.
   */
  panelId?: string;
}
