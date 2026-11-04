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
  LensMetricConfig,
  LensXyConfig,
  LensXyDataLayer,
  LensXyEsqlReferenceLinesLayer,
  LensXyLayer,
} from './types';

/** The chart types the Lens materializer maps. */
const MAPPED_TYPES: ReadonlySet<string> = new Set(['metric', 'xy']);

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
): { metric: LensMetricConfig } | { xy: LensXyConfig } | UnsupportedNode => {
  if (!MAPPED_TYPES.has(chart.type)) {
    return unsupportedType(chart.type);
  }
  if (chart.type === 'metric') {
    return isEsqlSource(chart) ? { metric: chart as LensMetricConfig } : unsupportedDataView();
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
  const context: MaterializeContextOverride = {
    ...(ignoreGlobalFilters ? { ignoreGlobalFilters: true } : {}),
    ...(filters.length > 0 ? { filters } : {}),
  };
  return {
    kind: 'esql',
    query,
    ...(timeField ? { timeField } : {}),
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
  if ('metric' in mapped) {
    return [esqlRequest(mapped.metric as EsqlSource, filters)];
  }
  return xyQueryLayers(mapped.xy).map((layer) => esqlRequest(layer as EsqlSource, filters));
};
