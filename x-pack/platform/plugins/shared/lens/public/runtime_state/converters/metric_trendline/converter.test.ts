/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CountIndexPatternColumn,
  DatasourceStates,
  FormBasedPrivateState,
  GenericIndexPatternColumn,
  IndexPatternMap,
  MetricVisualizationState,
  TermsIndexPatternColumn,
} from '@kbn/lens-common';
import { hydrateMetricTrendlineLayer } from './converter';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const INDEX_PATTERN_ID = 'my-index-pattern';
const MAIN_LAYER_ID = 'layer_0';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';
const TIME_FIELD = '@timestamp';

const countColumn: CountIndexPatternColumn = {
  label: 'Count of records',
  dataType: 'number',
  operationType: 'count',
  isBucketed: false,
  sourceField: '___records___',
  params: { emptyAsNull: true },
};

const avgColumn = {
  label: 'Average of bytes',
  dataType: 'number' as const,
  operationType: 'average' as const,
  isBucketed: false,
  sourceField: 'bytes',
  params: { emptyAsNull: true },
};

const termsColumn: TermsIndexPatternColumn = {
  label: 'Top 5 values of extension',
  dataType: 'string',
  operationType: 'terms',
  isBucketed: true,
  sourceField: 'extension.keyword',
  params: {
    size: 5,
    orderBy: { type: 'column', columnId: 'metric_accessor' },
    orderDirection: 'desc',
    otherBucket: true,
    missingBucket: false,
    parentFormat: { id: 'terms' },
    include: [],
    exclude: [],
    includeIsRegex: false,
    excludeIsRegex: false,
  },
};

/** Builds the minimal FormBasedPrivateState needed for tests */
function buildFormBasedState(
  extraColumns: Record<string, unknown> = {},
  extraColumnOrder: string[] = []
): FormBasedPrivateState {
  return {
    currentIndexPatternId: INDEX_PATTERN_ID,
    layers: {
      [MAIN_LAYER_ID]: {
        indexPatternId: INDEX_PATTERN_ID,
        columns: {
          metric_accessor: countColumn,
          ...extraColumns,
        } as FormBasedPrivateState['layers'][string]['columns'],
        columnOrder: ['metric_accessor', ...extraColumnOrder],
        sampling: 1,
        ignoreGlobalFilters: false,
      },
    },
  };
}

/** Wraps a FormBasedPrivateState in the DatasourceStates envelope */
function wrapDatasourceStates(state: FormBasedPrivateState): DatasourceStates {
  return { formBased: { isLoading: false, state } };
}

const indexPatterns: IndexPatternMap = {
  [INDEX_PATTERN_ID]: {
    id: INDEX_PATTERN_ID,
    title: 'my-index-*',
    timeFieldName: TIME_FIELD,
    fields: [],
    getFieldByName: () => undefined,
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
    hasRestrictions: false,
    isPersisted: true,
    spec: {},
  },
};

const indexPatternsNoTime: IndexPatternMap = {
  [INDEX_PATTERN_ID]: {
    ...indexPatterns[INDEX_PATTERN_ID],
    timeFieldName: undefined,
  },
};

/** Minimal MetricVisualizationState with trendline fields */
function buildVizState(
  overrides: Partial<MetricVisualizationState> = {}
): MetricVisualizationState {
  return {
    layerId: MAIN_LAYER_ID,
    layerType: 'data',
    metricAccessor: 'metric_accessor',
    trendlineLayerId: TRENDLINE_LAYER_ID,
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'metric_accessor_trendline',
    trendlineTimeAccessor: 'x_date_histogram',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('hydrateMetricTrendlineLayer', () => {
  describe('no-op guards', () => {
    it('returns datasourceStates unchanged when visualizationType is not lnsMetric', () => {
      const states = wrapDatasourceStates(buildFormBasedState());
      const result = hydrateMetricTrendlineLayer('lnsXY', buildVizState(), states, indexPatterns);
      expect(result).toBe(states);
    });

    it('returns datasourceStates unchanged when visualizationType is null', () => {
      const states = wrapDatasourceStates(buildFormBasedState());
      const result = hydrateMetricTrendlineLayer(null, buildVizState(), states, indexPatterns);
      expect(result).toBe(states);
    });

    it('returns datasourceStates unchanged when trendlineLayerId is not set', () => {
      const states = wrapDatasourceStates(buildFormBasedState());
      const vizState = buildVizState({ trendlineLayerId: undefined });
      const result = hydrateMetricTrendlineLayer('lnsMetric', vizState, states, indexPatterns);
      expect(result).toBe(states);
    });

    it('returns datasourceStates unchanged when formBased datasource is missing', () => {
      const states: DatasourceStates = { textBased: { isLoading: false, state: {} } };
      const result = hydrateMetricTrendlineLayer(
        'lnsMetric',
        buildVizState(),
        states,
        indexPatterns
      );
      expect(result).toBe(states);
    });

    it('returns datasourceStates unchanged when main layer is missing', () => {
      const stateWithNoMainLayer: FormBasedPrivateState = {
        currentIndexPatternId: INDEX_PATTERN_ID,
        layers: {},
      };
      const states = wrapDatasourceStates(stateWithNoMainLayer);
      const result = hydrateMetricTrendlineLayer(
        'lnsMetric',
        buildVizState(),
        states,
        indexPatterns
      );
      expect(result).toBe(states);
    });

    it('returns datasourceStates unchanged when indexPattern has no timeFieldName', () => {
      const states = wrapDatasourceStates(buildFormBasedState());
      const result = hydrateMetricTrendlineLayer(
        'lnsMetric',
        buildVizState(),
        states,
        indexPatternsNoTime
      );
      expect(result).toBe(states);
    });

    it('is idempotent: returns datasourceStates unchanged when trendline layer already exists', () => {
      const formBasedState = buildFormBasedState();
      formBasedState.layers[TRENDLINE_LAYER_ID] = {
        indexPatternId: INDEX_PATTERN_ID,
        linkToLayers: [MAIN_LAYER_ID],
        columns: { x_date_histogram: {} as GenericIndexPatternColumn },
        columnOrder: ['x_date_histogram'],
        sampling: 1,
        ignoreGlobalFilters: false,
      };
      const states = wrapDatasourceStates(formBasedState);
      const result = hydrateMetricTrendlineLayer(
        'lnsMetric',
        buildVizState(),
        states,
        indexPatterns
      );
      expect(result).toBe(states);
    });
  });

  describe('trendline layer creation — primary metric only', () => {
    let result: DatasourceStates;

    beforeEach(() => {
      const states = wrapDatasourceStates(buildFormBasedState());
      result = hydrateMetricTrendlineLayer('lnsMetric', buildVizState(), states, indexPatterns);
    });

    it('adds the trendline layer to the formBased datasource state', () => {
      const layers = (result.formBased!.state as FormBasedPrivateState).layers;
      expect(layers[TRENDLINE_LAYER_ID]).toBeDefined();
    });

    it('preserves the main layer unchanged', () => {
      const layers = (result.formBased!.state as FormBasedPrivateState).layers;
      expect(layers[MAIN_LAYER_ID]).toBeDefined();
      expect(Object.keys(layers[MAIN_LAYER_ID].columns)).toEqual(['metric_accessor']);
    });

    it('sets linkToLayers pointing to the main layer', () => {
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];
      expect(layer.linkToLayers).toEqual([MAIN_LAYER_ID]);
    });

    it('sets indexPatternId matching the main layer', () => {
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];
      expect(layer.indexPatternId).toBe(INDEX_PATTERN_ID);
    });

    it('creates a date_histogram column at trendlineTimeAccessor using the DataView time field', () => {
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];
      const timeCol = layer.columns.x_date_histogram;
      expect(timeCol).toMatchObject({
        operationType: 'date_histogram',
        dataType: 'date',
        isBucketed: true,
        sourceField: TIME_FIELD,
        params: { interval: 'auto' },
      });
    });

    it('copies the primary metric column at trendlineMetricAccessor', () => {
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];
      expect(layer.columns.metric_accessor_trendline).toEqual(countColumn);
    });

    it('puts time column before metric column in columnOrder', () => {
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];
      expect(layer.columnOrder).toEqual(['x_date_histogram', 'metric_accessor_trendline']);
    });

    it('does not mutate the original datasourceStates', () => {
      const original = wrapDatasourceStates(buildFormBasedState());
      hydrateMetricTrendlineLayer('lnsMetric', buildVizState(), original, indexPatterns);
      const layers = (original.formBased!.state as FormBasedPrivateState).layers;
      expect(layers[TRENDLINE_LAYER_ID]).toBeUndefined();
    });
  });

  describe('trendline layer creation — with secondary metric', () => {
    it('copies the secondary metric column at trendlineSecondaryMetricAccessor', () => {
      const states = wrapDatasourceStates(
        buildFormBasedState({ secondary_accessor: avgColumn }, ['secondary_accessor'])
      );
      const vizState = buildVizState({
        secondaryMetricAccessor: 'secondary_accessor',
        trendlineSecondaryMetricAccessor: 'secondary_accessor_trendline',
      });
      const result = hydrateMetricTrendlineLayer('lnsMetric', vizState, states, indexPatterns);
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];

      expect(layer.columns.secondary_accessor_trendline).toEqual(avgColumn);
      expect(layer.columnOrder).toContain('secondary_accessor_trendline');
    });

    it('does not include secondary column in trendline when secondaryMetricAccessor is not in main layer', () => {
      const states = wrapDatasourceStates(buildFormBasedState());
      const vizState = buildVizState({
        secondaryMetricAccessor: 'missing_secondary',
        trendlineSecondaryMetricAccessor: 'secondary_accessor_trendline',
      });
      const result = hydrateMetricTrendlineLayer('lnsMetric', vizState, states, indexPatterns);
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];

      expect(layer.columns.secondary_accessor_trendline).toBeUndefined();
    });
  });

  describe('trendline layer creation — with breakdown', () => {
    it('copies the breakdown column at trendlineBreakdownByAccessor after the time column', () => {
      const states = wrapDatasourceStates(
        buildFormBasedState({ breakdown_accessor: termsColumn }, ['breakdown_accessor'])
      );
      const vizState = buildVizState({
        breakdownByAccessor: 'breakdown_accessor',
        trendlineBreakdownByAccessor: 'breakdown_accessor_trendline',
      });
      const result = hydrateMetricTrendlineLayer('lnsMetric', vizState, states, indexPatterns);
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];

      expect(layer.columns.breakdown_accessor_trendline).toEqual(termsColumn);
      // breakdown bucket should appear after the time column, before metrics
      const order = layer.columnOrder;
      expect(order.indexOf('x_date_histogram')).toBeLessThan(
        order.indexOf('breakdown_accessor_trendline')
      );
      expect(order.indexOf('breakdown_accessor_trendline')).toBeLessThan(
        order.indexOf('metric_accessor_trendline')
      );
    });
  });

  describe('trendline layer creation — all dimensions present', () => {
    it('produces a layer with time, breakdown, primary metric, and secondary metric columns', () => {
      const states = wrapDatasourceStates(
        buildFormBasedState({ secondary_accessor: avgColumn, breakdown_accessor: termsColumn }, [
          'breakdown_accessor',
          'secondary_accessor',
        ])
      );
      const vizState = buildVizState({
        secondaryMetricAccessor: 'secondary_accessor',
        trendlineSecondaryMetricAccessor: 'secondary_accessor_trendline',
        breakdownByAccessor: 'breakdown_accessor',
        trendlineBreakdownByAccessor: 'breakdown_accessor_trendline',
      });
      const result = hydrateMetricTrendlineLayer('lnsMetric', vizState, states, indexPatterns);
      const layer = (result.formBased!.state as FormBasedPrivateState).layers[TRENDLINE_LAYER_ID];

      expect(Object.keys(layer.columns)).toEqual(
        expect.arrayContaining([
          'x_date_histogram',
          'breakdown_accessor_trendline',
          'metric_accessor_trendline',
          'secondary_accessor_trendline',
        ])
      );
      // column order: time → breakdown → primary metric → secondary metric
      expect(layer.columnOrder).toEqual([
        'x_date_histogram',
        'breakdown_accessor_trendline',
        'metric_accessor_trendline',
        'secondary_accessor_trendline',
      ]);
    });
  });
});
