/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AdaptiveHeatmapChart,
  AdaptiveLens,
  ContinuousColorStop,
} from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';

import type { DiagnosticBag } from './diagnostics';
import { formatFromLensColumn, type LensColumnFormat } from './format_resolver';
import type { FormBasedLayer, HeatmapVisualizationState, LensState } from './types';

interface BuildHeatmapArgs {
  panelId: string;
  title: string;
  subtitle?: string;
  state: LensState;
  visualization: HeatmapVisualizationState;
  query: AdaptiveQuery;
  diagnostics: DiagnosticBag;
  fieldFormats?: Record<string, LensColumnFormat>;
  provenance?: AdaptiveLens['provenance'];
}

export const buildHeatmapLens = ({
  panelId,
  title,
  subtitle,
  state,
  visualization,
  query,
  diagnostics,
  fieldFormats,
  provenance,
}: BuildHeatmapArgs): AdaptiveLens | undefined => {
  const { xAccessor, yAccessor, valueAccessor } = visualization;
  if (!xAccessor || !valueAccessor) {
    diagnostics.push({
      level: 'error',
      code: 'lens.heatmap.missing-accessors',
      message: 'lnsHeatmap requires at least an xAccessor and a valueAccessor',
    });
    return undefined;
  }
  if (!yAccessor) {
    // 1D heatmap (just buckets) is supported via heatmapStrip directly; we
    // model it with a synthetic yBucket so the binder can fall through.
    diagnostics.push({
      level: 'info',
      code: 'lens.heatmap.1d-flattened',
      message: 'lnsHeatmap has no yAccessor; treating as a 1-D bucket strip',
    });
  }

  const formBasedLayer = firstFormBasedLayerById(state, visualization.layerId);
  const xColumn = formBasedLayer?.columns[xAccessor];
  const yColumn = yAccessor ? formBasedLayer?.columns[yAccessor] : undefined;
  const valueColumn = formBasedLayer?.columns[valueAccessor];

  const chart: AdaptiveHeatmapChart = {
    kind: 'heatmap',
    xBucket: { id: xAccessor, label: xColumn?.label ?? xAccessor },
    yBucket: yAccessor
      ? { id: yAccessor, label: yColumn?.label ?? yAccessor }
      : { id: '_synthetic_y', label: 'All' },
    value: { id: valueAccessor, label: valueColumn?.label ?? title },
    ...(() => {
      const colorStops = resolveHeatmapColorStops(visualization, diagnostics);
      return colorStops ? { colorStops } : {};
    })(),
  };

  diagnostics.push({
    level: 'info',
    code: 'lens.heatmap.lowered-to-adaptive-heatmap',
    message:
      'Lens heatmap lowered to Adaptive UI heatmap; bind step may fall back to heatmapStrip only when the y-axis is absent or collapses to one bucket',
  });

  const format = formatFromLensColumn(valueColumn, fieldFormats);

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

const resolveHeatmapColorStops = (
  visualization: HeatmapVisualizationState,
  diagnostics: DiagnosticBag
): ContinuousColorStop[] | undefined => {
  const rawStops = visualization.palette?.params?.stops;
  if (!rawStops || rawStops.length === 0) {
    return undefined;
  }
  const toneSequence: ContinuousColorStop['tone'][] = [
    'neutral',
    'primary',
    'warning',
    'risk',
    'danger',
  ];
  const stops = rawStops
    .map((stop): { at: number; color?: string } | undefined =>
      typeof stop.stop === 'number' && Number.isFinite(stop.stop)
        ? {
            at: clamp01(stop.stop > 1 ? stop.stop / 100 : stop.stop),
            ...(stop.color ? { color: stop.color } : {}),
          }
        : undefined
    )
    .filter((stop): stop is { at: number; color?: string } => stop !== undefined)
    .sort((a, b) => a.at - b.at)
    .map((stop, index, all) => {
      const toneIndex =
        all.length <= 1
          ? toneSequence.length - 1
          : Math.round((index / (all.length - 1)) * (toneSequence.length - 1));
      return {
        at: stop.at,
        tone: toneSequence[toneIndex] ?? 'primary',
        ...(stop.color ? { color: stop.color } : {}),
      };
    });

  if (stops.length === 0) {
    return undefined;
  }
  diagnostics.push({
    level: 'info',
    code: stops.some((stop) => stop.color)
      ? 'lens.heatmap.palette-preserved'
      : 'lens.heatmap.palette-approximated',
    message: stops.some((stop) => stop.color)
      ? `Lens heatmap palette colors preserved (${stops.length} stop(s))`
      : `Lens heatmap palette stops mapped to Adaptive UI tones (${stops.length} stop(s))`,
  });
  return stops;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const firstFormBasedLayerById = (state: LensState, layerId: string): FormBasedLayer | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  return layers?.[layerId];
};
