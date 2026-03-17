/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatasourceStates,
  FormBasedPrivateState,
  IndexPatternMap,
  MetricVisualizationState,
} from '@kbn/lens-common';
import { hydrateState } from '.';

const INDEX_PATTERN_ID = 'my-index-pattern';
const MAIN_LAYER_ID = 'layer_0';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';

const indexPatterns: IndexPatternMap = {
  [INDEX_PATTERN_ID]: {
    id: INDEX_PATTERN_ID,
    title: 'my-index-*',
    timeFieldName: '@timestamp',
    fields: [],
    getFieldByName: () => undefined,
    getIndexPattern: () => 'my-index-*',
    hasRestrictions: false,
    isPersisted: true,
    spec: {},
  },
};

const metricDatasourceStates: DatasourceStates = {
  formBased: {
    isLoading: false,
    state: {
      currentIndexPatternId: INDEX_PATTERN_ID,
      layers: {
        [MAIN_LAYER_ID]: {
          indexPatternId: INDEX_PATTERN_ID,
          columns: {
            metric_accessor: {
              label: 'Count',
              dataType: 'number',
              operationType: 'count',
              isBucketed: false,
              sourceField: '___records___',
              params: { emptyAsNull: true },
            },
          },
          columnOrder: ['metric_accessor'],
          sampling: 1,
          ignoreGlobalFilters: false,
        },
      },
    } as FormBasedPrivateState,
  },
};

const metricVizState: MetricVisualizationState = {
  layerId: MAIN_LAYER_ID,
  layerType: 'data',
  metricAccessor: 'metric_accessor',
  trendlineLayerId: TRENDLINE_LAYER_ID,
  trendlineLayerType: 'metricTrendline',
  trendlineMetricAccessor: 'metric_accessor_trendline',
  trendlineTimeAccessor: 'x_date_histogram',
};

describe('hydrateState', () => {
  it('runs all registered hydrators, producing a trendline layer for lnsMetric', () => {
    const result = hydrateState('lnsMetric', metricVizState, metricDatasourceStates, indexPatterns);
    const layers = (result.formBased!.state as FormBasedPrivateState).layers;
    expect(layers[TRENDLINE_LAYER_ID]).toBeDefined();
    expect(layers[TRENDLINE_LAYER_ID].columns.x_date_histogram).toMatchObject({
      operationType: 'date_histogram',
      sourceField: '@timestamp',
    });
  });

  it('is a no-op for non-metric visualization types', () => {
    const result = hydrateState('lnsXY', metricVizState, metricDatasourceStates, indexPatterns);
    expect(result).toBe(metricDatasourceStates);
  });

  it('passes through empty datasource states without throwing', () => {
    const empty: DatasourceStates = {};
    const result = hydrateState('lnsMetric', metricVizState, empty, indexPatterns);
    expect(result).toBe(empty);
  });
});
