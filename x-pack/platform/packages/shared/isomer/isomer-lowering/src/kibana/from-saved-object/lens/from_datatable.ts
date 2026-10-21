/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AdaptiveDatatableChart,
  AdaptiveLens,
  ColumnColorScale,
  ColumnRef,
} from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';

import { resolveLensColumn } from './column_resolver';
import type { DiagnosticBag } from './diagnostics';
import { type LensColumnFormat } from './format_resolver';
import type {
  DatatableColumnConfig,
  DatatableVisualizationState,
  FormBasedColumn,
  FormBasedLayer,
  LensState,
} from './types';

interface BuildDatatableArgs {
  panelId: string;
  title: string;
  subtitle?: string;
  state: LensState;
  visualization: DatatableVisualizationState;
  query: AdaptiveQuery;
  diagnostics: DiagnosticBag;
  fieldFormats?: Record<string, LensColumnFormat>;
  provenance?: AdaptiveLens['provenance'];
}

const toColumnAlign = (
  alignment: 'left' | 'right' | 'center' | undefined
): 'left' | 'right' | undefined => {
  if (alignment === 'left' || alignment === 'right') {
    return alignment;
  }
  // The table primitive has no `center`; fall back to `left` and let the
  // diagnostic surface the loss.
  return undefined;
};

const toTableDensity = (
  rowHeight: DatatableVisualizationState['rowHeight']
): AdaptiveDatatableChart['density'] | undefined => {
  if (rowHeight === 'single') {
    return 'compact';
  }
  if (rowHeight === 'auto' || rowHeight === 'custom') {
    return 'comfortable';
  }
  return undefined;
};

const toColumnFont = (
  source: FormBasedColumn | undefined,
  config: DatatableColumnConfig | undefined
): ColumnRef['font'] | undefined => {
  if (config?.font === 'default' || config?.font === 'monospace') {
    return config.font;
  }
  return source?.dataType === 'number' || source?.dataType === 'date' ? 'monospace' : undefined;
};

const toColumnSummary = (
  config: DatatableColumnConfig | undefined
): ColumnRef['summary'] | undefined => {
  if (config?.summaryRow === 'none') {
    return undefined;
  }
  if (
    config?.summaryRow === 'sum' ||
    config?.summaryRow === 'avg' ||
    config?.summaryRow === 'min' ||
    config?.summaryRow === 'max' ||
    config?.summaryRow === 'count'
  ) {
    return {
      function: config.summaryRow,
      ...(config.summaryLabel ? { label: config.summaryLabel } : {}),
    };
  }
  return config?.summaryLabel ? { function: 'count', label: config.summaryLabel } : undefined;
};

export const buildDatatableLens = ({
  panelId,
  title,
  subtitle,
  state,
  visualization,
  query,
  diagnostics,
  fieldFormats,
  provenance,
}: BuildDatatableArgs): AdaptiveLens | undefined => {
  const formBasedLayer = firstFormBasedLayerById(state, visualization.layerId);
  const textBasedLayer = state.datasourceStates?.textBased?.layers?.[visualization.layerId];
  if (!formBasedLayer && !textBasedLayer) {
    diagnostics.push({
      level: 'error',
      code: 'lens.datatable.no-layer',
      message: `lnsDatatable layer "${visualization.layerId}" not found in datasourceStates`,
    });
    return undefined;
  }

  // Visible ids come from `visualization.columns` (hidden/transposed flags).
  // Display order is `visualization.columnOrder` when present (10.3+), else
  // the form-based layer `columnOrder`, which is what Kibana actually paints.
  const columnConfig = visualization.columns ?? [];
  const visibleColumnIds = new Set(
    columnConfig.filter((column) => !column.hidden).map((column) => column.columnId)
  );
  // An empty visible set is not the same as absent metadata. Treating it as
  // absent re-exposed every column of a table whose config hides them all,
  // which is the opposite of what the saved object asks for. With this, such
  // a table falls through to the `no-columns` guard below and is reported as
  // unsupported instead of silently converted wrong.
  const keepVisible = (columnId: string): boolean =>
    columnConfig.length === 0 || visibleColumnIds.has(columnId);
  const orderedAccessors: string[] =
    visualization.columnOrder && visualization.columnOrder.length > 0
      ? visualization.columnOrder.filter(keepVisible)
      : formBasedLayer?.columnOrder && formBasedLayer.columnOrder.length > 0
      ? formBasedLayer.columnOrder.filter(keepVisible)
      : visualization.columns && visualization.columns.length > 0
      ? visualization.columns.filter((column) => !column.hidden).map((column) => column.columnId)
      : textBasedLayer?.columns.map((column) => column.columnId) ?? [];

  const seenColumns = new Set<string>();
  const columns: ColumnRef[] = [];
  for (const accessor of orderedAccessors) {
    if (seenColumns.has(accessor)) {
      continue;
    }
    const config = visualization.columns?.find((column) => column.columnId === accessor);
    if (config?.isTransposed) {
      diagnostics.push({
        level: 'warn',
        code: 'lens.datatable.transposed-column-flattened',
        message: `transposed column "${accessor}" is flattened to a regular column`,
      });
    }
    const resolved = resolveLensColumn(state, visualization.layerId, accessor, fieldFormats);
    if (!resolved) {
      diagnostics.push({
        level: 'warn',
        code: 'lens.datatable.unknown-column',
        message: `column accessor "${accessor}" is not defined in the layer`,
      });
      continue;
    }
    const source = resolved.formBased;
    if (config?.alignment === 'center') {
      diagnostics.push({
        level: 'info',
        code: 'lens.datatable.center-alignment-dropped',
        message: `column "${accessor}" requested center alignment; table primitive only supports left/right — falling back to default`,
      });
    }
    const align =
      toColumnAlign(config?.alignment) ?? (source?.dataType === 'number' ? 'right' : undefined);
    const label = resolved.label ?? accessor;
    const font = toColumnFont(source, config);
    const summary = toColumnSummary(config);
    const colorScale = resolveColumnColorScale(config, diagnostics, accessor);
    columns.push({
      // The id must match the ES|QL output column: the accessor for
      // formBased, the column's `fieldName` for textBased.
      id: resolved.dataName,
      label,
      ...(align ? { align } : {}),
      ...(font ? { font } : {}),
      ...(summary ? { summary } : {}),
      ...(resolved.format ? { format: resolved.format } : {}),
      ...(colorScale ? { colorScale } : {}),
    });
    seenColumns.add(accessor);
  }

  if (columns.length === 0) {
    diagnostics.push({
      level: 'error',
      code: 'lens.datatable.no-columns',
      message: 'lnsDatatable has no visible columns after filtering hidden flags',
    });
    return undefined;
  }

  const density = toTableDensity(visualization.rowHeight);
  const chart: AdaptiveDatatableChart = {
    kind: 'datatable',
    ...(density ? { density } : {}),
    columns,
  };

  // `TableNode.sort.column` has to name one of `TableNode.columns`, or the
  // table schema's cross-field check rejects the spec. A terms bucket is
  // commonly ranked by a metric the table then hides, so the sort a saved
  // object implies is not always one this table can express. The ES|QL is
  // already ordered, so dropping the table sort loses presentation, not data.
  const emittedColumnIds = new Set(columns.map((column) => column.id));
  const applySort = (
    columnId: string,
    direction: NonNullable<AdaptiveDatatableChart['sort']>['direction']
  ): void => {
    if (!emittedColumnIds.has(columnId)) {
      diagnostics.push({
        level: 'info',
        code: 'lens.datatable.sort-column-hidden',
        message: `sort column "${columnId}" is not one of the visible columns; the query is already ordered, so no table sort is emitted`,
      });
      return;
    }
    chart.sort = { column: columnId, direction };
  };

  if (
    visualization.sorting?.columnId &&
    visualization.sorting.direction &&
    visualization.sorting.direction !== 'none'
  ) {
    applySort(
      resolveLensColumn(state, visualization.layerId, visualization.sorting.columnId, fieldFormats)
        ?.dataName ?? visualization.sorting.columnId,
      visualization.sorting.direction
    );
  } else {
    const termsSort = termsSortFromLayer(formBasedLayer);
    if (termsSort) {
      applySort(
        resolveLensColumn(state, visualization.layerId, termsSort.columnId, fieldFormats)
          ?.dataName ?? termsSort.columnId,
        termsSort.direction
      );
    }
  }

  return {
    id: panelId,
    title,
    ...(subtitle ? { subtitle } : {}),
    chart,
    query,
    ...(provenance ? { provenance } : {}),
  };
};

const firstFormBasedLayerById = (state: LensState, layerId: string): FormBasedLayer | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  return layers?.[layerId];
};

// Translate a Lens `colorMode` + `palette` pair into the `ColumnColorScale`
// shape understood by the Adaptive UI table primitive. When Lens stores
// concrete colors we preserve those strings and also attach a tone fallback
// for renderers that cannot use raw CSS colors.
//
// Lens's `colorMode === 'none'` short-circuits to `undefined` — no scale
// means the binder skips heat resolution entirely for that column.
const resolveColumnColorScale = (
  config: DatatableColumnConfig | undefined,
  diagnostics: DiagnosticBag,
  accessor: string
): ColumnColorScale | undefined => {
  if (!config?.colorMode || config.colorMode === 'none') {
    return undefined;
  }
  const mode: ColumnColorScale['mode'] = config.colorMode === 'text' ? 'text' : 'cell';

  // Default 4-stop sequential heat scale (low to high = neutral to danger).
  // Stops are placed at 0, 0.33, 0.66, 1 so the renderer steps cleanly
  // through the four tones as values traverse the column's domain.
  const defaultStops: ColumnColorScale['stops'] = [
    { at: 0, tone: 'neutral' },
    { at: 0.34, tone: 'primary' },
    { at: 0.67, tone: 'warning' },
    { at: 0.9, tone: 'danger' },
  ];

  const params = config.palette?.params;
  if (!params?.stops || params.stops.length === 0) {
    diagnostics.push({
      level: 'info',
      code: 'lens.datatable.color-palette-defaulted',
      message: `column "${accessor}" requested heat coloring without explicit stops; using Adaptive UI's default sequential scale`,
    });
    return { mode, stops: defaultStops };
  }

  // Map explicit stops ordinally to a tone ladder while preserving the exact
  // stop colors for React/SVG renderers.
  const sequence: ColumnColorScale['stops'][number]['tone'][] = [
    'neutral',
    'primary',
    'warning',
    'risk',
    'danger',
  ];
  const stops = params.stops
    .map((stop): { at: number; color?: string } | undefined =>
      typeof stop.stop === 'number' && Number.isFinite(stop.stop)
        ? {
            at: clamp01(
              params.rangeType === 'percent' && stop.stop > 1 ? stop.stop / 100 : stop.stop
            ),
            ...(stop.color ? { color: stop.color } : {}),
          }
        : undefined
    )
    .filter((stop): stop is { at: number; color?: string } => stop !== undefined)
    .sort((a, b) => a.at - b.at)
    .map((stop, index, all) => {
      const toneIndex =
        all.length <= 1
          ? sequence.length - 1
          : Math.round((index / (all.length - 1)) * (sequence.length - 1));
      const tone = params.reverse ? sequence[sequence.length - 1 - toneIndex] : sequence[toneIndex];
      return {
        at: stop.at,
        tone: tone ?? 'neutral',
        ...(stop.color ? { color: stop.color } : {}),
      };
    });
  if (stops.length === 0) {
    return { mode, stops: defaultStops };
  }
  diagnostics.push({
    level: 'info',
    code: stops.some((stop) => stop.color)
      ? 'lens.datatable.color-palette-preserved'
      : 'lens.datatable.color-palette-approximated',
    message: stops.some((stop) => stop.color)
      ? `column "${accessor}" Lens palette colors preserved (${stops.length} stop(s))`
      : `column "${accessor}" Lens palette stops mapped to Adaptive UI tones (${stops.length} stop(s))`,
  });
  return { mode, stops };
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const termsSortFromLayer = (
  layer: FormBasedLayer | undefined
): { columnId: string; direction: 'asc' | 'desc' } | undefined => {
  if (!layer) {
    return undefined;
  }
  const terms = Object.values(layer.columns).find((column) => column.operationType === 'terms');
  if (!terms) {
    return undefined;
  }
  const params = terms.params ?? {};
  const direction = params.orderDirection === 'asc' ? 'asc' : 'desc';
  const orderBy = params.orderBy;
  const orderByColumnId =
    orderBy &&
    typeof orderBy === 'object' &&
    'columnId' in orderBy &&
    typeof (orderBy as { columnId?: unknown }).columnId === 'string'
      ? (orderBy as { columnId: string }).columnId
      : undefined;
  const metric = layer.columnOrder.find((id) => {
    const column = layer.columns[id];
    return column && !column.isBucketed;
  });
  const columnId = orderByColumnId ?? metric;
  return columnId ? { columnId, direction } : undefined;
};
