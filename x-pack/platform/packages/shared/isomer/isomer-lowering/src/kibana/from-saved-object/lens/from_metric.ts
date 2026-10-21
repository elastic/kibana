/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveLens, AdaptiveMetricChart, MetricColorRule } from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';

import type { DiagnosticBag } from './diagnostics';
import {
  formatFromLensColumn,
  formatFromRawLensFormat,
  type LensColumnFormat,
} from './format_resolver';
import type {
  FormBasedColumn,
  FormBasedLayer,
  LensState,
  MetricVisualizationState,
  TextBasedColumn,
} from './types';

interface BuildMetricArgs {
  panelId: string;
  title: string;
  subtitle?: string;
  state: LensState;
  visualization: MetricVisualizationState;
  query: AdaptiveQuery;
  diagnostics: DiagnosticBag;
  fieldFormats?: Record<string, LensColumnFormat>;
  provenance?: AdaptiveLens['provenance'];
  synthesizeLayerQuery?: (layerId: string) => AdaptiveQuery | undefined;
  /**
   * `lnsLegacyMetric` and `lnsMetric` have slightly different state shapes;
   * the caller passes the visualization type so we can pick the right
   * accessor field.
   */
  visualizationType: string;
}

export const buildMetricLens = ({
  panelId,
  title,
  subtitle,
  state,
  visualization,
  query,
  diagnostics,
  fieldFormats,
  provenance,
  synthesizeLayerQuery,
  visualizationType,
}: BuildMetricArgs): AdaptiveLens | undefined => {
  const primaryAccessor = visualization.metricAccessor ?? visualization.accessor;
  if (!primaryAccessor) {
    diagnostics.push({
      level: 'error',
      code: 'lens.metric.no-accessor',
      message: `${visualizationType} has no primary metric accessor`,
    });
    return undefined;
  }

  const formBasedLayer = firstFormBasedLayerById(state, visualization.layerId);
  const primaryColumn = formBasedLayer?.columns[primaryAccessor];
  // ES|QL (textBased) metric panels keep their column metadata in the
  // textBased layer; the label/format live there, not in a formBased column.
  const textColumn = primaryColumn
    ? undefined
    : findTextBasedColumn(state, visualization.layerId, primaryAccessor);
  const primaryLabel = primaryColumn?.label ?? textColumn?.label ?? textColumn?.fieldName ?? title;

  const chart: AdaptiveMetricChart = {
    kind: 'metric',
    primary: {
      id: primaryAccessor,
      label: primaryLabel,
      ...metricColorFields(visualization),
    },
  };

  if (visualization.secondaryMetricAccessor) {
    const secondaryColumn = formBasedLayer?.columns[visualization.secondaryMetricAccessor];
    const secondaryFormat = formatFromLensColumn(secondaryColumn, fieldFormats);
    chart.secondary = {
      id: visualization.secondaryMetricAccessor,
      label: secondaryColumn?.label ?? 'Secondary',
      ...(secondaryFormat ? { format: secondaryFormat } : {}),
    };
  }

  if (visualization.maxAccessor) {
    const maxColumn = formBasedLayer?.columns[visualization.maxAccessor];
    chart.max = {
      id: visualization.maxAccessor,
      label: maxColumn?.label ?? 'Maximum',
    };
  }

  if (visualization.trendlineMetricAccessor || visualization.trendlineLayerId) {
    const resolvedTrend = resolveTrendAccessor(state, visualization, {
      primaryLayer: formBasedLayer,
    });
    if (resolvedTrend) {
      const { accessor, column, source } = resolvedTrend;
      const trendQuery =
        source === 'sibling-layer' && synthesizeLayerQuery
          ? synthesizeLayerQuery(resolvedTrend.sourceLayerId)
          : undefined;
      chart.trend = {
        id: accessor,
        ...(column?.label ? { label: column.label } : {}),
        ...(trendQuery ? { query: trendQuery } : {}),
      };
      if (source === 'sibling-layer') {
        // The trendline column lives in a different formBased layer than
        // the primary metric, so it needs its own query. When synthesis is
        // available we attach it to `chart.trend.query`; the plan layer will
        // expose it as an auxiliary query and bind it back into metricTrend.
        diagnostics.push({
          level: 'info',
          code: 'lens.metric.trendline-from-sibling-layer',
          message: `metric trendline accessor "${accessor}" resolved from sibling layer "${visualization.trendlineLayerId}"`,
        });
      }
    } else {
      diagnostics.push({
        level: 'warn',
        code: 'lens.metric.trendline-unresolved',
        message:
          'metric panel declared a trendline but neither `trendlineMetricAccessor` nor a sibling layer with a numeric column was usable; rendering as a plain stat',
      });
    }
  }

  // Pull the dashboard author's number format off the primary column so
  // percentages render as percentages, bytes as bytes, etc.
  const format = primaryColumn
    ? formatFromLensColumn(primaryColumn, fieldFormats)
    : formatFromRawLensFormat(textColumn?.params?.format);

  return {
    id: panelId,
    title,
    ...(subtitle ? { subtitle } : {}),
    chart,
    query,
    ...(format ? { format } : {}),
    ...(provenance ? { provenance } : {}),
  };
};

const metricColorFields = (
  visualization: MetricVisualizationState
): { colorRules?: MetricColorRule[] } => {
  const rules = resolveMetricColorRules(visualization);
  return rules.length > 0 ? { colorRules: rules } : {};
};

const resolveMetricColorRules = (visualization: MetricVisualizationState): MetricColorRule[] => {
  if (
    !visualization.colorMode ||
    visualization.colorMode === 'none' ||
    !visualization.palette?.params?.stops
  ) {
    return [];
  }
  const stops = visualization.palette.params.stops.filter(
    (stop): stop is { stop: number; color?: string } =>
      typeof stop.stop === 'number' && Number.isFinite(stop.stop)
  );
  if (stops.length === 0) {
    return [];
  }
  const sorted = [...stops].sort((a, b) => a.stop - b.stop);
  const toneSequence: MetricColorRule['tone'][] = ['success', 'warning', 'danger'];
  const maybeReversed = visualization.palette.params.reverse ? [...sorted].reverse() : sorted;
  return maybeReversed.map((stop, index, all) => {
    const toneIndex =
      all.length <= 1
        ? toneSequence.length - 1
        : Math.round((index / (all.length - 1)) * (toneSequence.length - 1));
    return {
      at: stop.stop,
      tone: toneSequence[toneIndex] ?? 'warning',
    };
  });
};

const firstFormBasedLayerById = (state: LensState, layerId: string): FormBasedLayer | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  return layers?.[layerId];
};

const findTextBasedColumn = (
  state: LensState,
  layerId: string,
  columnId: string
): TextBasedColumn | undefined =>
  state.datasourceStates?.textBased?.layers?.[layerId]?.columns?.find(
    (column) => column.columnId === columnId
  );

interface ResolvedTrendAccessor {
  accessor: string;
  column: FormBasedColumn | undefined;
  source: 'primary-layer' | 'sibling-layer';
  sourceLayerId: string;
}

// Resolve which column carries the metric's trendline. Lens stores the
// trendline in one of two shapes:
//
//   1. `trendlineMetricAccessor` names a column on the *primary* layer
//      (older shape). Easy: use it directly.
//   2. `trendlineLayerId` names a sibling formBased layer that owns its
//      own metric + bucket columns (newer shape). We pick the first
//      non-bucketed column from that layer's `columnOrder` so the bind
//      step has a stable accessor to look up.
//
// Returns `undefined` when neither shape produces a usable accessor — the
// caller turns that into a `lens.metric.trendline-unresolved` diagnostic.
const resolveTrendAccessor = (
  state: LensState,
  visualization: MetricVisualizationState,
  context: { primaryLayer: FormBasedLayer | undefined }
): ResolvedTrendAccessor | undefined => {
  if (visualization.trendlineMetricAccessor) {
    return {
      accessor: visualization.trendlineMetricAccessor,
      column: context.primaryLayer?.columns[visualization.trendlineMetricAccessor],
      source: 'primary-layer',
      sourceLayerId: visualization.layerId,
    };
  }
  if (!visualization.trendlineLayerId) {
    return undefined;
  }
  const siblingLayer = firstFormBasedLayerById(state, visualization.trendlineLayerId);
  if (!siblingLayer) {
    return undefined;
  }
  const order = siblingLayer.columnOrder ?? Object.keys(siblingLayer.columns);
  for (const id of order) {
    const column = siblingLayer.columns[id];
    if (column && !column.isBucketed) {
      return {
        accessor: id,
        column,
        source: 'sibling-layer',
        sourceLayerId: visualization.trendlineLayerId,
      };
    }
  }
  return undefined;
};
