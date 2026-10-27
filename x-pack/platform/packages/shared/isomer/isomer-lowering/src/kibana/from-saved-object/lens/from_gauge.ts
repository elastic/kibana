/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveGaugeChart, AdaptiveLens, Band } from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';

import type { DiagnosticBag } from './diagnostics';
import { formatFromLensColumn, type LensColumnFormat } from './format_resolver';
import type { FormBasedLayer, GaugeVisualizationState, LensState } from './types';

interface BuildGaugeArgs {
  panelId: string;
  title: string;
  subtitle?: string;
  state: LensState;
  visualization: GaugeVisualizationState;
  query: AdaptiveQuery;
  diagnostics: DiagnosticBag;
  fieldFormats?: Record<string, LensColumnFormat>;
  provenance?: AdaptiveLens['provenance'];
}

const DEFAULT_RANGE = { min: 0, max: 100 };

export const buildGaugeLens = ({
  panelId,
  title,
  subtitle,
  state,
  visualization,
  query,
  diagnostics,
  fieldFormats,
  provenance,
}: BuildGaugeArgs): AdaptiveLens | undefined => {
  const metricAccessor = visualization.metricAccessor;
  if (!metricAccessor) {
    diagnostics.push({
      level: 'error',
      code: 'lens.gauge.no-metric-accessor',
      message: 'lnsGauge has no metric accessor',
    });
    return undefined;
  }

  const formBasedLayer = firstFormBasedLayerById(state, visualization.layerId);
  const metricColumn = formBasedLayer?.columns[metricAccessor];
  const valueLabel = metricColumn?.label ?? title;

  // Range resolution order: explicit min/max, then min/maxAccessor column
  // labels (the binder reads the actual values from the data table), then a
  // sensible default. We always emit *something* so the gauge primitive's
  // required `max` field is satisfied.
  let min = visualization.min ?? DEFAULT_RANGE.min;
  let max = visualization.max ?? DEFAULT_RANGE.max;
  if (visualization.minAccessor) {
    diagnostics.push({
      level: 'info',
      code: 'lens.gauge.dynamic-min-from-host',
      message: `min sourced from accessor "${visualization.minAccessor}"; binder will override the static default at bind time`,
    });
  }
  if (visualization.maxAccessor) {
    diagnostics.push({
      level: 'info',
      code: 'lens.gauge.dynamic-max-from-host',
      message: `max sourced from accessor "${visualization.maxAccessor}"; binder will override the static default at bind time`,
    });
  }
  if (min >= max) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.gauge.invalid-range-clamped',
      message: `min (${min}) >= max (${max}); clamping to ${DEFAULT_RANGE.min}..${DEFAULT_RANGE.max}`,
    });
    min = DEFAULT_RANGE.min;
    max = DEFAULT_RANGE.max;
  }

  // Translate palette stops to bands (if present). The gauge primitive
  // accepts up to 5 ordered bands; everything beyond is dropped with a
  // diagnostic.
  let bands: Band[] | undefined;
  const stops = visualization.palette?.params?.stops;
  if (stops && stops.length > 0) {
    const orderedStops = stops
      .filter(
        (stop): stop is { stop: number; color?: string } =>
          typeof stop.stop === 'number' && Number.isFinite(stop.stop)
      )
      .sort((a, b) => a.stop - b.stop)
      .slice(0, 5);
    if (stops.length > 5) {
      diagnostics.push({
        level: 'info',
        code: 'lens.gauge.bands-capped',
        message: `palette had ${stops.length} stops; gauge primitive accepts up to 5 bands`,
      });
    }
    bands = orderedStops.map((stop) => ({
      end: stop.stop,
      tone: gaugeBandTone(orderedStops.indexOf(stop), orderedStops.length),
      ...(stop.color ? { color: stop.color } : {}),
    }));
  }

  const chart: AdaptiveGaugeChart = {
    kind: 'gauge',
    value: { id: metricAccessor, label: valueLabel },
    ...(visualization.shape ? { shape: visualization.shape } : {}),
    range: { min, max },
    ...(bands && bands.length > 0 ? { bands } : {}),
    ...(typeof visualization.goal === 'number' ? { target: visualization.goal } : {}),
  };

  const format = formatFromLensColumn(metricColumn, fieldFormats);

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

const gaugeBandTone = (index: number, count: number): NonNullable<Band['tone']> => {
  const tones: Array<NonNullable<Band['tone']>> = ['danger', 'warning', 'success'];
  if (count <= 1) {
    return 'accent';
  }
  const toneIndex = Math.round((index / (count - 1)) * (tones.length - 1));
  return tones[toneIndex] ?? 'accent';
};

const firstFormBasedLayerById = (state: LensState, layerId: string): FormBasedLayer | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  return layers?.[layerId];
};
