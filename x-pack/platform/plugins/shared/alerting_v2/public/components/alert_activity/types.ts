/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';

export interface AlertActivityWidgetProps {
  /** Rule ids to aggregate across. Pass a single id for per-rule views. */
  ruleIds: string[];
  /** Absolute ISO time range the widget should query for. */
  timeRange: { gte: string; lte: string };
  /** ES|QL time duration literal used as the bucket size (e.g. `1 hour`). */
  fixedInterval: string;
}

export interface AlertsOverTimeChartProps extends AlertActivityWidgetProps {
  /**
   * Time range used when building the "Explore in Discover" link.
   * Accepts relative values like `now-30d` / `now` because Discover supports them
   * natively, which keeps the link semantics intact after auto-refresh.
   */
  discoverTimeRange: TimeRange;
  /** Optional accessible label overriding the default panel title. */
  title?: string;
  /** Optional callback when the user brushes a time range on the chart. */
  onBrushEnd?: (range: { from: string; to: string }) => void;
}

export interface AlertActivityCardProps extends AlertActivityWidgetProps {
  /** Optional sub-label next to the title (e.g. "Last 30 days"). */
  lookbackLabel?: string;
}
