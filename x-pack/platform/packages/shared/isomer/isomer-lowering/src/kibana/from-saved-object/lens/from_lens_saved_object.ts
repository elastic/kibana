/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withRenderedLabels } from './lens_labels';
import type { AdaptiveLens } from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';
import type { ViewPlanDiagnostic } from '../../plan/view_plan';
import type { SavedObjectEnvelope } from '../ndjson';
import { SavedObjectEnvelopeSchema } from '../schema';

import { createDiagnosticBag } from './diagnostics';
import { synthesizeQuery } from './esql_synthesis';
import type { LensColumnFormat } from './format_resolver';
import { buildDatatableLens } from './from_datatable';
import { buildGaugeLens } from './from_gauge';
import { buildHeatmapLens } from './from_heatmap';
import { buildMetricLens } from './from_metric';
import { buildPartitionLens } from './from_partition';
import { buildXyLens } from './from_xy';
import type {
  DatatableVisualizationState,
  GaugeVisualizationState,
  HeatmapVisualizationState,
  LensAttributes,
  LensState,
  MetricVisualizationState,
  PartitionVisualizationState,
  XyVisualizationState,
} from './types';

export interface FromLensSavedObjectOptions {
  /**
   * Base URL of the Kibana instance, used to construct a deep-link back to
   * the live panel. Optional — the converter is happy without it.
   */
  kibanaBaseUrl?: string;
  /**
   * Map from saved-object reference name to a resolved title (e.g. the
   * index pattern title). Lens panels reference data views by id; the host
   * resolves them and passes the title down here so ES|QL synthesis can
   * use it as the `FROM` clause.
   */
  resolveReferenceTitle?: (name: string, id: string, type: string) => string | undefined;
  /**
   * Resolve a data view's `timeFieldName` (e.g. `timestamp`,
   * `event.created`) from a saved-object reference. The ES|QL synthesizer
   * uses this when emitting time-shift `WHERE` clauses for Lens formulas.
   * Falls back to a `date_histogram` bucket's field, then `@timestamp`,
   * when unresolved.
   */
  resolveDataViewTimeField?: (name: string, id: string, type: string) => string | undefined;
  /**
   * Resolve a data view's field format map. Lens often omits per-column
   * `params.format` when the column should inherit the data-view field
   * formatter (for example eCommerce currency fields).
   */
  resolveDataViewFieldFormats?: (
    name: string,
    id: string,
    type: string
  ) => Record<string, LensColumnFormat> | undefined;
  /** Resolve a data view's field custom labels (`fieldAttrs[field].customLabel`), which Lens's default labels use. */
  resolveDataViewFieldLabels?: (
    name: string,
    id: string,
    type: string
  ) => Record<string, string> | undefined;
  /**
   * Optional Kibana-style time range applied to every synthesized query.
   * Endpoints accept `'now'`, `'now-7d'`, `'now-24h'`, … or ISO 8601
   * absolute strings. When set, the synthesizer adds a top-level
   * `WHERE <timeField> >= <from> AND <timeField> < <to>` clause and also
   * sizes the time-shift analysis window from the range's "from"
   * duration. Leave unset to query the full index.
   */
  timeRange?: { from: string; to: string };
}

export interface FromLensSavedObjectResult {
  lens: AdaptiveLens | undefined;
  diagnostics: ViewPlanDiagnostic[];
}

/**
 * Lower a single Lens saved-object envelope into an `AdaptiveLens`.
 *
 * Returns `lens: undefined` and a list of diagnostics when the panel uses
 * features that cannot be represented; callers should surface the
 * panel as `unsupported` with a deep link back to Kibana.
 */
export const fromLensSavedObject = (
  rawEnvelope: SavedObjectEnvelope,
  options: FromLensSavedObjectOptions = {}
): FromLensSavedObjectResult => {
  const parsedEnvelope = SavedObjectEnvelopeSchema.safeParse(rawEnvelope);
  const envelope = parsedEnvelope.success ? parsedEnvelope.data : undefined;
  const bag = createDiagnosticBag(envelope?.id);
  if (!envelope) {
    bag.push({
      level: 'error',
      code: 'lens.invalid-envelope',
      message: 'Lens saved-object envelope failed runtime validation',
    });
    return { lens: undefined, diagnostics: bag.list };
  }
  if (envelope.type !== 'lens') {
    bag.push({
      level: 'error',
      code: 'lens.wrong-type',
      message: `expected a "lens" envelope; got "${envelope.type}"`,
    });
    return { lens: undefined, diagnostics: bag.list };
  }

  const attributes = envelope.attributes as Partial<LensAttributes>;
  if (!attributes || typeof attributes !== 'object') {
    bag.push({
      level: 'error',
      code: 'lens.no-attributes',
      message: 'saved-object envelope has no attributes',
    });
    return { lens: undefined, diagnostics: bag.list };
  }

  const ownTitle = typeof attributes.title === 'string' ? attributes.title.trim() : '';
  const title = ownTitle || `Lens panel ${envelope.id}`;
  const subtitle = attributes.description;
  const visualizationType = attributes.visualizationType;
  const state = attributes.state;
  if (!state || typeof state !== 'object' || !visualizationType) {
    bag.push({
      level: 'error',
      code: 'lens.no-state',
      message: 'Lens attributes missing visualizationType or state',
    });
    return { lens: undefined, diagnostics: bag.list };
  }

  // Resolve the first index-pattern reference's title so ES|QL synthesis can
  // use it as the FROM source. We also try to resolve the data view's
  // configured `timeFieldName`; the synthesizer needs it for time-shift
  // formula `WHERE` clauses on data sets that don't use `@timestamp`
  // (e.g. the sample `kibana_sample_data_flights` data view uses
  // `timestamp`).
  const { indexPatternTitle, timeFieldName, fieldFormats, fieldLabels } = resolveIndexPatternMeta(
    envelope,
    state,
    options
  );

  const query = synthesizeQuery({
    state,
    diagnostics: bag,
    ...(indexPatternTitle ? { indexPatternTitle } : {}),
    ...(timeFieldName ? { timeFieldName } : {}),
    ...(options.timeRange ? { timeRange: options.timeRange } : {}),
  });
  if (!query) {
    return { lens: undefined, diagnostics: bag.list };
  }

  const provenance: AdaptiveLens['provenance'] = {
    source: `Kibana saved object lens/${envelope.id}`,
    savedObjectId: envelope.id,
    visualizationType,
    ...(options.kibanaBaseUrl
      ? {
          kibanaUrl: `${options.kibanaBaseUrl.replace(
            /\/$/,
            ''
          )}/app/lens#/edit/${encodeURIComponent(envelope.id)}`,
        }
      : {}),
  };

  const commonArgs = {
    panelId: envelope.id,
    title,
    ...(subtitle ? { subtitle } : {}),
    // Columns named as Lens renders them; the query above is synthesized from the state as saved.
    state: withRenderedLabels(state, fieldLabels),
    query: query.query,
    diagnostics: bag,
    ...(fieldFormats ? { fieldFormats } : {}),
    provenance,
  };
  const synthesizeLayerQuery = (layerId: string): AdaptiveQuery | undefined =>
    synthesizeQuery({
      state,
      diagnostics: bag,
      preferredLayerId: layerId,
      ...(indexPatternTitle ? { indexPatternTitle } : {}),
      ...(timeFieldName ? { timeFieldName } : {}),
      ...(options.timeRange ? { timeRange: options.timeRange } : {}),
    })?.query;

  switch (visualizationType) {
    case 'lnsXY': {
      const visualization = state.visualization as XyVisualizationState | undefined;
      if (!visualization || !visualization.layers) {
        bag.push({
          level: 'error',
          code: 'lens.xy.no-visualization',
          message: 'lnsXY visualization missing `state.visualization`',
        });
        return { lens: undefined, diagnostics: bag.list };
      }
      const lens = buildXyLens({ ...commonArgs, visualization });
      return { lens, diagnostics: bag.list };
    }
    case 'lnsMetric':
    case 'lnsLegacyMetric': {
      const visualization = state.visualization as MetricVisualizationState | undefined;
      if (!visualization) {
        bag.push({
          level: 'error',
          code: 'lens.metric.no-visualization',
          message: `${visualizationType} missing \`state.visualization\``,
        });
        return { lens: undefined, diagnostics: bag.list };
      }
      const lens = buildMetricLens({
        ...commonArgs,
        visualization,
        visualizationType,
        synthesizeLayerQuery,
      });
      return { lens, diagnostics: bag.list };
    }
    case 'lnsPie': {
      const visualization = state.visualization as PartitionVisualizationState | undefined;
      if (!visualization || !visualization.layers) {
        bag.push({
          level: 'error',
          code: 'lens.partition.no-visualization',
          message: 'lnsPie visualization missing `state.visualization`',
        });
        return { lens: undefined, diagnostics: bag.list };
      }
      const lens = buildPartitionLens({ ...commonArgs, visualization });
      return { lens, diagnostics: bag.list };
    }
    case 'lnsDatatable': {
      const visualization = state.visualization as DatatableVisualizationState | undefined;
      if (!visualization) {
        bag.push({
          level: 'error',
          code: 'lens.datatable.no-visualization',
          message: 'lnsDatatable visualization missing `state.visualization`',
        });
        return { lens: undefined, diagnostics: bag.list };
      }
      const lens = buildDatatableLens({ ...commonArgs, visualization });
      return { lens, diagnostics: bag.list };
    }
    case 'lnsGauge': {
      const visualization = state.visualization as GaugeVisualizationState | undefined;
      if (!visualization) {
        bag.push({
          level: 'error',
          code: 'lens.gauge.no-visualization',
          message: 'lnsGauge visualization missing `state.visualization`',
        });
        return { lens: undefined, diagnostics: bag.list };
      }
      const lens = buildGaugeLens({ ...commonArgs, visualization });
      return { lens, diagnostics: bag.list };
    }
    case 'lnsHeatmap': {
      const visualization = state.visualization as HeatmapVisualizationState | undefined;
      if (!visualization) {
        bag.push({
          level: 'error',
          code: 'lens.heatmap.no-visualization',
          message: 'lnsHeatmap visualization missing `state.visualization`',
        });
        return { lens: undefined, diagnostics: bag.list };
      }
      const lens = buildHeatmapLens({ ...commonArgs, visualization });
      return { lens, diagnostics: bag.list };
    }
    default:
      bag.push({
        level: 'error',
        code: 'lens.unsupported-visualization-type',
        message: `visualizationType "${visualizationType}" is not handled (supported: XY, Metric, Donut/Pie, Datatable, Gauge, Heatmap)`,
      });
      return { lens: undefined, diagnostics: bag.list };
  }
};

const looksLikeUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const resolveIndexPatternMeta = (
  envelope: SavedObjectEnvelope,
  state: LensState,
  options: FromLensSavedObjectOptions
): {
  indexPatternTitle?: string;
  timeFieldName?: string;
  fieldFormats?: Record<string, LensColumnFormat>;
  fieldLabels?: Record<string, string>;
} => {
  const indexPatternRefs = state.datasourceStates?.textBased?.indexPatternRefs ?? [];
  const indexPatternRef = envelope.references?.find(
    (ref) =>
      ref.type === 'index-pattern' || ref.type === 'data-view' || ref.name?.includes('indexpattern')
  );
  const inlineRef =
    (indexPatternRef ? indexPatternRefs.find((ref) => ref.id === indexPatternRef.id) : undefined) ??
    indexPatternRefs.find((ref) => typeof ref.title === 'string' && ref.title.length > 0);

  const resolvedTitle = indexPatternRef
    ? options.resolveReferenceTitle?.(
        indexPatternRef.name,
        indexPatternRef.id,
        indexPatternRef.type
      )
    : undefined;
  const title = resolvedTitle && !looksLikeUuid(resolvedTitle) ? resolvedTitle : inlineRef?.title;
  const resolvedTimeField = indexPatternRef
    ? options.resolveDataViewTimeField?.(
        indexPatternRef.name,
        indexPatternRef.id,
        indexPatternRef.type
      )
    : undefined;
  const timeFieldName = resolvedTimeField ?? inlineRef?.timeField;
  const fieldFormats = indexPatternRef
    ? options.resolveDataViewFieldFormats?.(
        indexPatternRef.name,
        indexPatternRef.id,
        indexPatternRef.type
      )
    : undefined;
  const fieldLabels = indexPatternRef
    ? options.resolveDataViewFieldLabels?.(
        indexPatternRef.name,
        indexPatternRef.id,
        indexPatternRef.type
      )
    : undefined;
  return {
    ...(title ? { indexPatternTitle: title } : {}),
    ...(timeFieldName ? { timeFieldName } : {}),
    ...(fieldFormats ? { fieldFormats } : {}),
    ...(fieldLabels ? { fieldLabels } : {}),
  };
};
