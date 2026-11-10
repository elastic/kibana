/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import type { Filter } from '@kbn/es-query';
import { parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { MaterializeContext } from '../../../common';
import type { UnsupportedNode } from '../nodes';
import type { DataRequest, EsqlDataRequest, MaterializeContextOverride } from '../types';
import { createUnsupportedNode } from '../unsupported';
import type {
  LensApiConfig,
  LensDatatableConfig,
  LensGaugeConfig,
  LensHeatmapConfig,
  LensMetricConfig,
  LensPartitionConfig,
  LensXyConfig,
  LensXyDataLayer,
  LensXyEsqlReferenceLinesLayer,
  LensXyLayer,
} from './types';

/** The time field Kibana's ES|QL time field resolution falls back to. */
const DEFAULT_TIME_FIELD = '@timestamp';

/** A chart that runs one ES|QL query, whose table it maps. */
export type LensSingleQueryConfig =
  | LensMetricConfig
  | LensDatatableConfig
  | LensPartitionConfig
  | LensHeatmapConfig
  | LensGaugeConfig;

/** The chart types that run one query, which the Lens materializer maps. */
const SINGLE_QUERY_TYPES: ReadonlySet<string> = new Set<LensSingleQueryConfig['type']>([
  'metric',
  'data_table',
  'pie',
  'treemap',
  'mosaic',
  'waffle',
  'heatmap',
  'gauge',
]);

interface EsqlSource {
  data_source: { type: 'esql'; query: string };
  ignore_global_filters?: boolean;
}

const isEsqlSource = (value: { data_source?: { type: string } }): boolean =>
  value.data_source?.type === 'esql';

/** An xy layer that reads data: a data layer, or reference lines from a query. */
export const isXyDataLayer = (layer: LensXyLayer): layer is LensXyDataLayer =>
  layer.type !== 'reference_lines' && layer.type !== 'annotations' && isEsqlSource(layer);

export const isXyEsqlReferenceLinesLayer = (
  layer: LensXyLayer
): layer is LensXyEsqlReferenceLinesLayer =>
  layer.type === 'reference_lines' && isEsqlSource(layer);

const isStaticReferenceLinesLayer = (layer: LensXyLayer): boolean =>
  layer.type === 'reference_lines' &&
  layer.thresholds.every(
    (threshold) => 'operation' in threshold && threshold.operation === 'static_value'
  );

/** The xy layers that run a query, in layer order: their tables arrive in this order. */
export const xyQueryLayers = (
  chart: LensXyConfig
): Array<LensXyDataLayer | LensXyEsqlReferenceLinesLayer> =>
  chart.layers.filter(
    (layer): layer is LensXyDataLayer | LensXyEsqlReferenceLinesLayer =>
      isXyDataLayer(layer) || isXyEsqlReferenceLinesLayer(layer)
  );

const unsupportedType = (type: string) =>
  createUnsupportedNode(
    i18n.translate('xpack.isomer.materialize.lens.unsupportedType', {
      defaultMessage: 'Lens "{type}" charts cannot be materialized yet.',
      values: { type },
    })
  );

const unsupportedDataView = () =>
  createUnsupportedNode(
    i18n.translate('xpack.isomer.materialize.lens.unsupportedDataView', {
      defaultMessage:
        'Lens charts that query a data view cannot be materialized yet; only ES|QL charts can.',
    })
  );

/** The chart, narrowed to the ES|QL chart types the materializer maps, or why it can't be. */
export const asMappedChart = (
  chart: LensApiConfig
): { single: LensSingleQueryConfig } | { xy: LensXyConfig } | UnsupportedNode => {
  if (SINGLE_QUERY_TYPES.has(chart.type)) {
    return isEsqlSource(chart as { data_source?: { type: string } })
      ? { single: chart as LensSingleQueryConfig }
      : unsupportedDataView();
  }
  if (chart.type === 'xy') {
    // Annotation layers never read the chart's data; the mapping records the ones it can't draw.
    const layers = chart.layers as LensXyLayer[];
    const readsDataView = layers.some(
      (layer) =>
        layer.type !== 'annotations' &&
        (layer.type as string) !== 'annotation_group' &&
        !isEsqlSource(layer) &&
        !isStaticReferenceLinesLayer(layer)
    );
    if (readsDataView || !layers.some(isXyDataLayer)) {
      return unsupportedDataView();
    }
    return { xy: chart as LensXyConfig };
  }
  return unsupportedType(chart.type);
};

/** The panel's own filters, as the Kibana filters Lens applies with them. */
const panelFilters = (chart: LensApiConfig): Filter[] =>
  chart.filters?.length ? toStoredFilters(chart.filters) ?? [] : [];

const esqlRequest = (
  { data_source: { query }, ignore_global_filters: ignoreGlobalFilters }: EsqlSource,
  filters: Filter[]
): EsqlDataRequest => {
  const timeField = parseTimeFieldFromESQLQuery(query);
  // Without ?_tstart or ?_tend, Kibana filters on @timestamp when every index the query reads has it.
  const context: MaterializeContextOverride = {
    ...(ignoreGlobalFilters ? { ignoreGlobalFilters: true } : {}),
    ...(filters.length > 0 ? { filters } : {}),
  };
  return {
    kind: 'esql',
    query,
    ...(timeField ? { timeField } : { defaultTimeField: DEFAULT_TIME_FIELD }),
    ...(Object.keys(context).length > 0 ? { context } : {}),
  };
};

/**
 * One ES|QL request per query the chart runs, in the order its layers run them, each with the
 * panel's filters and the layer's choice to ignore the global ones, as Lens runs them.
 */
export const planLensChart = (
  chart: LensApiConfig,
  _context: MaterializeContext
): DataRequest[] | UnsupportedNode => {
  const mapped = asMappedChart(chart);
  if ('type' in mapped) {
    return mapped;
  }
  const filters = panelFilters(chart);
  if ('single' in mapped) {
    return [esqlRequest(mapped.single as EsqlSource, filters)];
  }
  return xyQueryLayers(mapped.xy).map((layer) => esqlRequest(layer as EsqlSource, filters));
};
