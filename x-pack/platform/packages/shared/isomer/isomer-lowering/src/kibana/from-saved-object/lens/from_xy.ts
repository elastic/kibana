/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveLens, AdaptiveXyChart, SeriesRef } from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';
import type { Reference } from '../../model/references';

import { isEmittableBucket, resolveLensColumn } from './column_resolver';
import type { DiagnosticBag } from './diagnostics';
import { type LensColumnFormat } from './format_resolver';
import type {
  FormBasedColumn,
  FormBasedLayer,
  LensState,
  XyLayer,
  XyVisualizationState,
} from './types';

const seriesTypeToMode = (
  raw: string | undefined
): {
  mode: AdaptiveXyChart['mode'];
  stacked: boolean;
  stack?: AdaptiveXyChart['stack'];
  orientation: 'horizontal' | 'vertical';
} => {
  switch (raw) {
    case 'line':
      return { mode: 'line', stacked: false, orientation: 'vertical' };
    case 'area':
      return { mode: 'area', stacked: false, orientation: 'vertical' };
    case 'area_stacked':
      return {
        mode: 'area',
        stacked: true,
        stack: 'stacked',
        orientation: 'vertical',
      };
    case 'area_percentage_stacked':
      return {
        mode: 'area',
        stacked: true,
        stack: 'percentage',
        orientation: 'vertical',
      };
    case 'bar':
      return { mode: 'bar', stacked: false, orientation: 'vertical' };
    case 'bar_stacked':
      return {
        mode: 'bar',
        stacked: true,
        stack: 'stacked',
        orientation: 'vertical',
      };
    case 'bar_percentage_stacked':
      return {
        mode: 'bar',
        stacked: true,
        stack: 'percentage',
        orientation: 'vertical',
      };
    case 'bar_horizontal':
      return { mode: 'bar', stacked: false, orientation: 'horizontal' };
    case 'bar_horizontal_stacked':
      return {
        mode: 'bar',
        stacked: true,
        stack: 'stacked',
        orientation: 'horizontal',
      };
    case 'bar_horizontal_percentage_stacked':
      return {
        mode: 'bar',
        stacked: true,
        stack: 'percentage',
        orientation: 'horizontal',
      };
    default:
      return { mode: 'line', stacked: false, orientation: 'vertical' };
  }
};

const curveTypeToCurve = (raw: XyLayer['curveType']): AdaptiveXyChart['curve'] | undefined => {
  switch (raw) {
    case 'CURVE_MONOTONE_X':
      return 'monotone';
    case 'CURVE_STEP':
      return 'step';
    case 'LINEAR':
      return 'linear';
    default:
      return undefined;
  }
};

const fittingFunctionToMissingValues = (
  raw: XyLayer['fittingFunction']
): AdaptiveXyChart['missingValues'] | undefined => {
  switch (raw) {
    case 'Zero':
      return 'zero';
    case 'Carry':
    case 'Lookahead':
    case 'Nearest':
      return 'carry';
    case 'Average':
    case 'Linear':
      return 'linear';
    default:
      return undefined;
  }
};

const numericReferenceValue = (raw: unknown): number | undefined => {
  const value = typeof raw === 'string' && raw.trim().length > 0 ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const staticReferenceValue = (column: FormBasedColumn | undefined): number | undefined => {
  const params = column?.params as { value?: unknown; staticValue?: unknown } | undefined;
  return numericReferenceValue(params?.value) ?? numericReferenceValue(params?.staticValue);
};

const collectReferenceLines = (state: LensState, referenceLayers: XyLayer[]): Reference[] =>
  referenceLayers.flatMap((layer) => {
    const formBasedLayer = firstFormBasedLayerById(state, layer.layerId);
    return (layer.accessors ?? []).flatMap((accessor): Reference[] => {
      const column = formBasedLayer?.columns[accessor];
      const value = staticReferenceValue(column);
      if (value === undefined) {
        return [];
      }
      const label =
        typeof column?.label === 'string' && column.label.trim().length > 0
          ? column.label
          : undefined;
      return [{ value, ...(label ? { label } : {}) }];
    });
  });

const referenceAccessorCount = (referenceLayers: XyLayer[]): number =>
  referenceLayers.reduce((total, layer) => total + (layer.accessors?.length ?? 0), 0);

interface BuildXyArgs {
  panelId: string;
  title: string;
  subtitle?: string;
  state: LensState;
  visualization: XyVisualizationState;
  query: AdaptiveQuery;
  diagnostics: DiagnosticBag;
  fieldFormats?: Record<string, LensColumnFormat>;
  provenance?: AdaptiveLens['provenance'];
}

export const buildXyLens = ({
  panelId,
  title,
  subtitle,
  state,
  visualization,
  query,
  diagnostics,
  fieldFormats,
  provenance,
}: BuildXyArgs): AdaptiveLens | undefined => {
  const dataLayer = visualization.layers.find(
    (layer): layer is XyLayer & { layerType?: 'data' } =>
      !layer.layerType || layer.layerType === 'data'
  );
  if (!dataLayer || !dataLayer.accessors) {
    diagnostics.push({
      level: 'error',
      code: 'lens.xy.no-data-layer',
      message: 'XY visualization has no usable data layer',
    });
    return undefined;
  }

  // Horizontal bars and "split-only" charts commonly omit `xAccessor` and
  // use the split (categorical breakdown) as the chart's x axis. Kibana 10.3
  // stores that as `splitAccessors[]`; older exports use `splitAccessor`.
  const splitAccessorId = dataLayer.splitAccessor ?? dataLayer.splitAccessors?.[0];
  const xAccessorId = dataLayer.xAccessor ?? splitAccessorId;
  if (!xAccessorId) {
    diagnostics.push({
      level: 'error',
      code: 'lens.xy.no-x-or-split',
      message:
        'XY visualization has neither an x-axis nor a split-by accessor; nothing to plot against',
    });
    return undefined;
  }
  const xCameFromSplit = !dataLayer.xAccessor && !!splitAccessorId;

  const referenceLayers = visualization.layers.filter(
    (layer) => layer.layerType === 'referenceLine'
  );
  const references = collectReferenceLines(state, referenceLayers);
  const droppedReferenceCount = referenceAccessorCount(referenceLayers) - references.length;
  if (references.length > 0) {
    diagnostics.push({
      level: 'info',
      code: 'lens.xy.reference-lines-preserved',
      message: `${references.length} static reference line(s) preserved`,
    });
  }
  if (droppedReferenceCount > 0) {
    diagnostics.push({
      level: 'info',
      code: 'lens.xy.reference-lines-dropped',
      message: `${droppedReferenceCount} non-static reference line(s) dropped`,
    });
  }

  const annotations = visualization.layers.filter((layer) => layer.layerType === 'annotations');
  if (annotations.length > 0) {
    diagnostics.push({
      level: 'info',
      code: 'lens.xy.annotations-dropped',
      message: `${annotations.length} annotation layer(s) dropped (no Adaptive UI equivalent)`,
    });
  }

  const { mode, stacked, stack, orientation } = seriesTypeToMode(
    dataLayer.seriesType ?? visualization.preferredSeriesType
  );
  const curve = curveTypeToCurve(dataLayer.curveType ?? visualization.curveType);
  const missingValues = fittingFunctionToMissingValues(
    dataLayer.fittingFunction ?? visualization.fittingFunction
  );
  const showValueLabels = (dataLayer.valueLabels ?? visualization.valueLabels) === 'show';
  if (orientation === 'horizontal' && (mode === 'line' || mode === 'area')) {
    diagnostics.push({
      level: 'info',
      code: 'lens.xy.horizontal-non-bar-collapsed',
      message: `${mode} charts ignore the horizontal-orientation hint; rendering vertically`,
    });
  }

  // Resolve accessors against whichever datasource owns this layer. For
  // textBased (ES|QL) layers the data column name is the column's
  // `fieldName`, not the opaque Lens `columnId` the visualization references.
  const xResolved = resolveLensColumn(state, dataLayer.layerId, xAccessorId, fieldFormats);
  const xDataName = xResolved?.dataName ?? xAccessorId;
  const xAxis = {
    id: xDataName,
    label: xResolved?.label ?? visualization.xTitle ?? xDataName,
  };

  // Resolve the split-by accessor. Drop it when it maps to a bucket that
  // ES|QL synthesis can't emit (e.g. a `filters` bucket) — otherwise the
  // binder would look for a column that never made it into the query and
  // bail with an empty result.
  let splitField: string | undefined;
  if (splitAccessorId && !xCameFromSplit) {
    const splitResolved = resolveLensColumn(
      state,
      dataLayer.layerId,
      splitAccessorId,
      fieldFormats
    );
    const splitFormBased = splitResolved?.formBased;
    if (splitResolved && (!splitFormBased || isEmittableBucket(splitFormBased))) {
      splitField = splitResolved.dataName;
    } else {
      diagnostics.push({
        level: 'warn',
        code: 'lens.xy.split-bucket-dropped',
        message: `split-by accessor "${splitAccessorId}" uses an unsupported bucket (${
          splitFormBased?.operationType ?? 'unknown'
        }); rendering without the breakdown`,
      });
    }
  }

  const ySeries: SeriesRef[] = dataLayer.accessors.map((accessor) => {
    const yResolved = resolveLensColumn(state, dataLayer.layerId, accessor, fieldFormats);
    const yDataName = yResolved?.dataName ?? accessor;
    const yConfig = dataLayer.yConfig?.find((entry) => entry.forAccessor === accessor);
    if (yConfig?.axisMode === 'right') {
      diagnostics.push({
        level: 'info',
        code: 'lens.xy.secondary-axis-preserved',
        message: `series "${yResolved?.label ?? yDataName}" was mapped to the secondary y-axis`,
      });
    }
    return {
      id: yDataName,
      label: yResolved?.label ?? yDataName,
      ...(yConfig?.axisMode === 'right' ? { axis: 'right' as const } : {}),
      // Lens lets authors override a series' color from the panel chrome;
      // forward the raw CSS string so the primitive can paint the exact
      // brand color instead of resolving through `tone`.
      ...(yConfig?.color ? { color: yConfig.color } : {}),
      // Only carry `splitOnField` when the split survived resolution as an
      // emittable breakdown column.
      ...(splitField ? { splitOnField: splitField } : {}),
    };
  });

  if (xCameFromSplit) {
    diagnostics.push({
      level: 'info',
      code: 'lens.xy.split-promoted-to-x',
      message:
        'XY chart had no x-axis accessor; promoted the split-by accessor to the x-axis (typical for horizontal bars)',
    });
  }

  if (splitField && ySeries.length > 1) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.xy.split-with-multi-y-collapsed',
      message:
        'split-by accessor combined with multiple y accessors is not fully supported; keeping the first metric',
    });
  }

  const chart: AdaptiveXyChart = {
    kind: 'xy',
    mode,
    stacked,
    ...(stack ? { stack } : {}),
    ...(orientation === 'horizontal' && mode === 'bar' ? { orientation } : {}),
    ...(curve ? { curve } : {}),
    ...(missingValues ? { missingValues } : {}),
    ...(showValueLabels ? { showValueLabels } : {}),
    ...(visualization.legend?.isVisible === false ? { showLegend: false } : {}),
    xAxis,
    yAxis: {
      id: ySeries[0]?.id ?? 'value',
      label: visualization.yTitle ?? ySeries[0]?.label ?? 'value',
    },
    ...(ySeries.some((series) => series.axis === 'right')
      ? {
          y2Axis: {
            id: ySeries.find((series) => series.axis === 'right')?.id ?? 'value_right',
            label: visualization.yRightTitle ?? 'value',
          },
        }
      : {}),
    series: ySeries,
  };

  // XY series share a single y-axis in Adaptive UI's primitive; reuse the
  // first series' column format as the chart-wide formatter so percentages
  // render as percentages on both axis ticks and tooltips. When series
  // format hints disagree (e.g. one percent + one number) we keep the
  // first and emit a diagnostic so the host knows.
  const seriesFormats = dataLayer.accessors.map(
    (accessor) => resolveLensColumn(state, dataLayer.layerId, accessor, fieldFormats)?.format
  );
  const firstFormat = seriesFormats.find((entry) => entry !== undefined);
  if (
    firstFormat &&
    seriesFormats.some((entry) => entry !== undefined && entry.kind !== firstFormat.kind)
  ) {
    diagnostics.push({
      level: 'info',
      code: 'lens.xy.mixed-formats-collapsed',
      message:
        "XY series have heterogeneous number formats; using the first series' format for the chart",
    });
  }

  return {
    id: panelId,
    title,
    ...(subtitle ? { subtitle } : {}),
    chart,
    query,
    ...(references.length > 0 ? { references } : {}),
    ...(firstFormat ? { format: firstFormat } : {}),
    ...(provenance ? { provenance } : {}),
  };
};

const firstFormBasedLayerById = (state: LensState, layerId: string): FormBasedLayer | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  return layers?.[layerId];
};

// Helper used by tests/inspection to peek at a layer's columns.
export const _internal = { firstFormBasedLayerById };
export type { FormBasedColumn };
