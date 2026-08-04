/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';

/**
 * Deterministic gate for {@link prettifyPanelConfigs}: return false when a
 * full vis-agent refresh would almost certainly be a no-op for the stated
 * `prettifyRules` (and cheap, related metric alignment cleanup).
 *
 * Chart types with no `prettifyRules` are skipped — the cleanup prompt has no
 * chart-specific deltas, so paying for an inner LLM call is pure fanout cost.
 */
export const panelNeedsPrettify = (chartType: SupportedChartType, config: unknown): boolean => {
  const prettifyRules = chartTypeRegistry[chartType].prompt.config?.prettifyRules ?? [];
  if (prettifyRules.length === 0) {
    return false;
  }

  if (chartType === SupportedChartType.Metric) {
    return metricNeedsPrettify(config);
  }

  if (chartType === SupportedChartType.XY) {
    return xyNeedsPrettify(config);
  }

  // Future chart types with prettifyRules: fail open until heuristics exist.
  return true;
};

const metricNeedsPrettify = (config: unknown): boolean => {
  if (!config || typeof config !== 'object') {
    return true;
  }

  const { metrics, styling } = config as {
    metrics?: Array<{ type?: string; color?: { type?: string } }>;
    styling?: {
      metric?: {
        value?: {
          alignment?: string;
        };
      };
    };
  };

  const primaryMetrics = (metrics ?? []).filter((metric) => metric.type === 'primary');
  const hasRedundantAutoColor = primaryMetrics.some((metric) => metric.color?.type === 'auto');

  // Prefer right-aligned values (perChartTypeRules). Omitted alignment defaults to right.
  const valueAlignment = styling?.metric?.value?.alignment;
  const hasNonRightAlignment =
    valueAlignment !== undefined && valueAlignment !== 'right';

  return hasRedundantAutoColor || hasNonRightAlignment;
};

const xyNeedsPrettify = (config: unknown): boolean => {
  if (!config || typeof config !== 'object') {
    return true;
  }

  const { layers } = config as { layers?: unknown[] };
  if (!Array.isArray(layers)) {
    return false;
  }

  return layers.some(hasXyExplicitColorOverride);
};

const hasXyExplicitColorOverride = (layer: unknown): boolean => {
  if (!layer || typeof layer !== 'object') {
    return false;
  }

  const { y, breakdown_by: breakdownBy } = layer as {
    y?: Array<{ color?: { type?: string } }>;
    breakdown_by?: { color?: unknown };
  };

  const yHasOverride = (y ?? []).some(
    (series) => series.color != null && series.color.type !== 'auto'
  );
  const breakdownHasOverride = breakdownBy?.color != null;

  return yHasOverride || breakdownHasOverride;
};
