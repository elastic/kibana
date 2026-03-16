/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ID_PREFIX = 'evals-';
const DATA_VIEW_ID = `${ID_PREFIX}data-view`;
const INDEX_PATTERN = 'kibana-evaluations*';
const DATA_VIEW_TITLE = 'Evaluation Scores';

export const SAVED_OBJECT_IDS = {
  dataView: DATA_VIEW_ID,
  scoreTrend: `${ID_PREFIX}score-trend`,
  modelComparison: `${ID_PREFIX}model-comparison`,
  evaluatorHeatmap: `${ID_PREFIX}evaluator-heatmap`,
  passRate: `${ID_PREFIX}pass-rate`,
  tokenUsage: `${ID_PREFIX}token-usage`,
  latencyDistribution: `${ID_PREFIX}latency-distribution`,
  regressionHighlight: `${ID_PREFIX}regression-highlight`,
  perSuiteBreakdown: `${ID_PREFIX}per-suite-breakdown`,
  dashboard: `${ID_PREFIX}dashboard`,
} as const;

interface SavedObject {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  references: Array<{ type: string; id: string; name: string }>;
}

const makeLayerRef = (layerId: string): { type: string; id: string; name: string } => ({
  type: 'index-pattern',
  id: DATA_VIEW_ID,
  name: `indexpattern-datasource-layer-${layerId}`,
});

const makeFormBasedLayer = (
  layerId: string,
  columns: Record<string, unknown>,
  columnOrder: string[]
): Record<string, unknown> => ({
  [layerId]: {
    columns,
    columnOrder,
    incompleteColumns: {},
    indexPatternId: DATA_VIEW_ID,
  },
});

const makeLensSavedObject = (
  id: string,
  title: string,
  visualizationType: string,
  layerId: string,
  columns: Record<string, unknown>,
  columnOrder: string[],
  visualization: Record<string, unknown>
): SavedObject => ({
  type: 'lens',
  id,
  attributes: {
    title,
    visualizationType,
    state: {
      datasourceStates: {
        formBased: {
          layers: makeFormBasedLayer(layerId, columns, columnOrder),
        },
      },
      visualization,
      filters: [],
      query: { language: 'kuery', query: '' },
    },
  },
  references: [makeLayerRef(layerId)],
});

const buildDataView = (): SavedObject => ({
  type: 'index-pattern',
  id: DATA_VIEW_ID,
  attributes: {
    title: INDEX_PATTERN,
    name: DATA_VIEW_TITLE,
    timeFieldName: '@timestamp',
  },
  references: [],
});

const buildScoreTrend = (): SavedObject => {
  const layerId = 'score-trend-layer';
  const columns: Record<string, unknown> = {
    timestamp: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      sourceField: '@timestamp',
    },
    score: {
      dataType: 'number',
      isBucketed: false,
      label: 'Mean Score',
      operationType: 'average',
      sourceField: 'evaluator.score',
    },
    breakdown: {
      dataType: 'string',
      isBucketed: true,
      label: 'Evaluator',
      operationType: 'terms',
      sourceField: 'evaluator.name',
      params: { size: 20, orderBy: { type: 'column', columnId: 'score' }, orderDirection: 'desc' },
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.scoreTrend,
    'Score Trend',
    'lnsXY',
    layerId,
    columns,
    ['timestamp', 'breakdown', 'score'],
    {
      preferredSeriesType: 'line',
      layers: [
        {
          layerId,
          seriesType: 'line',
          xAccessor: 'timestamp',
          accessors: ['score'],
          splitAccessor: 'breakdown',
          layerType: 'data',
        },
      ],
      title: 'Score Trend',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    }
  );
};

const buildModelComparison = (): SavedObject => {
  const layerId = 'model-comparison-layer';
  const columns: Record<string, unknown> = {
    model: {
      dataType: 'string',
      isBucketed: true,
      label: 'Model',
      operationType: 'terms',
      sourceField: 'task.model.id',
      params: { size: 20, orderBy: { type: 'column', columnId: 'score' }, orderDirection: 'desc' },
    },
    score: {
      dataType: 'number',
      isBucketed: false,
      label: 'Mean Score',
      operationType: 'average',
      sourceField: 'evaluator.score',
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.modelComparison,
    'Model Comparison',
    'lnsXY',
    layerId,
    columns,
    ['model', 'score'],
    {
      preferredSeriesType: 'bar_grouped',
      layers: [
        {
          layerId,
          seriesType: 'bar_grouped',
          xAccessor: 'model',
          accessors: ['score'],
          layerType: 'data',
        },
      ],
      title: 'Model Comparison',
    }
  );
};

const buildEvaluatorHeatmap = (): SavedObject => {
  const layerId = 'evaluator-heatmap-layer';
  const columns: Record<string, unknown> = {
    dataset: {
      dataType: 'string',
      isBucketed: true,
      label: 'Dataset',
      operationType: 'terms',
      sourceField: 'example.dataset.name',
      params: { size: 50, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
    },
    evaluator: {
      dataType: 'string',
      isBucketed: true,
      label: 'Evaluator',
      operationType: 'terms',
      sourceField: 'evaluator.name',
      params: { size: 50, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
    },
    score: {
      dataType: 'number',
      isBucketed: false,
      label: 'Mean Score',
      operationType: 'average',
      sourceField: 'evaluator.score',
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.evaluatorHeatmap,
    'Evaluator Heatmap',
    'lnsHeatmap',
    layerId,
    columns,
    ['dataset', 'evaluator', 'score'],
    {
      layerId,
      layerType: 'data',
      shape: 'heatmap',
      xAccessor: 'dataset',
      yAccessor: 'evaluator',
      valueAccessor: 'score',
      legend: { isVisible: true, position: 'right' },
    }
  );
};

const buildPassRate = (): SavedObject => {
  const layerId = 'pass-rate-layer';
  const columns: Record<string, unknown> = {
    runId: {
      dataType: 'string',
      isBucketed: true,
      label: 'Run ID',
      operationType: 'terms',
      sourceField: 'run_id',
      params: { size: 50, orderBy: { type: 'custom' }, orderDirection: 'asc' },
    },
    totalDocs: {
      dataType: 'number',
      isBucketed: false,
      label: 'Total',
      operationType: 'count',
      sourceField: '___records___',
    },
    passingDocs: {
      dataType: 'number',
      isBucketed: false,
      label: 'Passing (score >= 0.7)',
      operationType: 'count',
      sourceField: '___records___',
      filter: { language: 'kuery', query: 'evaluator.score >= 0.7' },
    },
    passRate: {
      dataType: 'number',
      isBucketed: false,
      label: 'Pass Rate',
      operationType: 'formula',
      params: {
        formula: "count(kql='evaluator.score >= 0.7') / count()",
        format: { id: 'percent', params: { decimals: 1 } },
      },
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.passRate,
    'Pass Rate Over Runs',
    'lnsXY',
    layerId,
    columns,
    ['runId', 'totalDocs', 'passingDocs', 'passRate'],
    {
      preferredSeriesType: 'area',
      layers: [
        {
          layerId,
          seriesType: 'area',
          xAccessor: 'runId',
          accessors: ['passRate'],
          layerType: 'data',
        },
      ],
      title: 'Pass Rate Over Runs',
    }
  );
};

const buildTokenUsage = (): SavedObject => {
  const layerId = 'token-usage-layer';
  const columns: Record<string, unknown> = {
    dataset: {
      dataType: 'string',
      isBucketed: true,
      label: 'Dataset',
      operationType: 'terms',
      sourceField: 'example.dataset.name',
      params: {
        size: 20,
        orderBy: { type: 'column', columnId: 'inputTokens' },
        orderDirection: 'desc',
      },
    },
    inputTokens: {
      dataType: 'number',
      isBucketed: false,
      label: 'Input Tokens',
      operationType: 'sum',
      sourceField: 'evaluator.metadata.input_tokens',
    },
    outputTokens: {
      dataType: 'number',
      isBucketed: false,
      label: 'Output Tokens',
      operationType: 'sum',
      sourceField: 'evaluator.metadata.output_tokens',
    },
    cachedTokens: {
      dataType: 'number',
      isBucketed: false,
      label: 'Cached Tokens',
      operationType: 'sum',
      sourceField: 'evaluator.metadata.cached_tokens',
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.tokenUsage,
    'Token Usage',
    'lnsXY',
    layerId,
    columns,
    ['dataset', 'inputTokens', 'outputTokens', 'cachedTokens'],
    {
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId,
          seriesType: 'bar_stacked',
          xAccessor: 'dataset',
          accessors: ['inputTokens', 'outputTokens', 'cachedTokens'],
          layerType: 'data',
        },
      ],
      title: 'Token Usage',
    }
  );
};

const buildLatencyDistribution = (): SavedObject => {
  const layerId = 'latency-distribution-layer';
  const columns: Record<string, unknown> = {
    latencyBucket: {
      dataType: 'number',
      isBucketed: true,
      label: 'Latency Score',
      operationType: 'range',
      sourceField: 'evaluator.score',
      params: {
        type: 'histogram',
        ranges: [{ from: 0, to: 1, label: '' }],
        maxBars: 20,
      },
    },
    count: {
      dataType: 'number',
      isBucketed: false,
      label: 'Count',
      operationType: 'count',
      sourceField: '___records___',
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.latencyDistribution,
    'Latency Distribution',
    'lnsXY',
    layerId,
    columns,
    ['latencyBucket', 'count'],
    {
      preferredSeriesType: 'bar',
      layers: [
        {
          layerId,
          seriesType: 'bar',
          xAccessor: 'latencyBucket',
          accessors: ['count'],
          layerType: 'data',
        },
      ],
      title: 'Latency Distribution',
      fittingFunction: 'None',
    }
  );
};

const buildRegressionHighlight = (): SavedObject => {
  const layerId = 'regression-highlight-layer';
  const columns: Record<string, unknown> = {
    lastValue: {
      dataType: 'number',
      isBucketed: false,
      label: 'Latest Mean Score',
      operationType: 'last_value',
      sourceField: 'evaluator.score',
      params: { sortField: '@timestamp' },
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.regressionHighlight,
    'Regression Highlight',
    'lnsMetric',
    layerId,
    columns,
    ['lastValue'],
    {
      layerId,
      layerType: 'data',
      metricAccessor: 'lastValue',
      color: '#6092C0',
      subtitle: 'Latest mean evaluator score',
      palette: {
        name: 'custom',
        type: 'palette',
        params: {
          steps: 3,
          stops: [
            { color: '#E7664C', stop: 0.5 },
            { color: '#D6BF57', stop: 0.7 },
            { color: '#54B399', stop: 1.0 },
          ],
          continuity: 'above',
          rangeType: 'number',
        },
      },
    }
  );
};

const buildPerSuiteBreakdown = (): SavedObject => {
  const layerId = 'per-suite-breakdown-layer';
  const columns: Record<string, unknown> = {
    dataset: {
      dataType: 'string',
      isBucketed: true,
      label: 'Dataset',
      operationType: 'terms',
      sourceField: 'example.dataset.name',
      params: { size: 100, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
    },
    evaluator: {
      dataType: 'string',
      isBucketed: true,
      label: 'Evaluator',
      operationType: 'terms',
      sourceField: 'evaluator.name',
      params: { size: 100, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
    },
    mean: {
      dataType: 'number',
      isBucketed: false,
      label: 'Mean',
      operationType: 'average',
      sourceField: 'evaluator.score',
    },
    median: {
      dataType: 'number',
      isBucketed: false,
      label: 'Median',
      operationType: 'median',
      sourceField: 'evaluator.score',
    },
    stdDev: {
      dataType: 'number',
      isBucketed: false,
      label: 'Std Dev',
      operationType: 'standard_deviation',
      sourceField: 'evaluator.score',
    },
    min: {
      dataType: 'number',
      isBucketed: false,
      label: 'Min',
      operationType: 'min',
      sourceField: 'evaluator.score',
    },
    max: {
      dataType: 'number',
      isBucketed: false,
      label: 'Max',
      operationType: 'max',
      sourceField: 'evaluator.score',
    },
  };

  return makeLensSavedObject(
    SAVED_OBJECT_IDS.perSuiteBreakdown,
    'Per-Suite Breakdown',
    'lnsDatatable',
    layerId,
    columns,
    ['dataset', 'evaluator', 'mean', 'median', 'stdDev', 'min', 'max'],
    {
      layerId,
      layerType: 'data',
      columns: [
        { columnId: 'dataset', isTransposed: false },
        { columnId: 'evaluator', isTransposed: false },
        { columnId: 'mean', isTransposed: false },
        { columnId: 'median', isTransposed: false },
        { columnId: 'stdDev', isTransposed: false },
        { columnId: 'min', isTransposed: false },
        { columnId: 'max', isTransposed: false },
      ],
    }
  );
};

interface PanelConfig {
  id: string;
  gridData: { x: number; y: number; w: number; h: number; i: string };
}

const buildDashboard = (): SavedObject => {
  const panels: PanelConfig[] = [
    { id: SAVED_OBJECT_IDS.scoreTrend, gridData: { x: 0, y: 0, w: 24, h: 15, i: 'panel-0' } },
    { id: SAVED_OBJECT_IDS.modelComparison, gridData: { x: 24, y: 0, w: 24, h: 15, i: 'panel-1' } },
    {
      id: SAVED_OBJECT_IDS.evaluatorHeatmap,
      gridData: { x: 0, y: 15, w: 24, h: 15, i: 'panel-2' },
    },
    { id: SAVED_OBJECT_IDS.passRate, gridData: { x: 24, y: 15, w: 24, h: 15, i: 'panel-3' } },
    { id: SAVED_OBJECT_IDS.tokenUsage, gridData: { x: 0, y: 30, w: 24, h: 15, i: 'panel-4' } },
    {
      id: SAVED_OBJECT_IDS.latencyDistribution,
      gridData: { x: 24, y: 30, w: 24, h: 15, i: 'panel-5' },
    },
    {
      id: SAVED_OBJECT_IDS.regressionHighlight,
      gridData: { x: 0, y: 45, w: 12, h: 10, i: 'panel-6' },
    },
    {
      id: SAVED_OBJECT_IDS.perSuiteBreakdown,
      gridData: { x: 12, y: 45, w: 36, h: 15, i: 'panel-7' },
    },
  ];

  const panelsJSON = panels.map((panel) => ({
    version: '8.0.0',
    type: 'lens',
    gridData: panel.gridData,
    panelIndex: panel.gridData.i,
    embeddableConfig: {},
    panelRefName: `panel_${panel.gridData.i}`,
  }));

  const controlGroupInput = {
    chainingSystem: 'HIERARCHICAL',
    controlStyle: 'oneLine',
    ignoreParentSettings: {
      ignoreFilters: false,
      ignoreQuery: false,
      ignoreTimerange: false,
      ignoreValidations: false,
    },
    panels: {
      'control-0': {
        order: 0,
        width: 'medium',
        type: 'optionsListControl',
        explicitInput: {
          id: 'control-0',
          fieldName: 'run_id',
          title: 'Run ID',
          dataViewId: DATA_VIEW_ID,
        },
      },
      'control-1': {
        order: 1,
        width: 'medium',
        type: 'optionsListControl',
        explicitInput: {
          id: 'control-1',
          fieldName: 'task.model.id',
          title: 'Model',
          dataViewId: DATA_VIEW_ID,
        },
      },
      'control-2': {
        order: 2,
        width: 'medium',
        type: 'optionsListControl',
        explicitInput: {
          id: 'control-2',
          fieldName: 'example.dataset.name',
          title: 'Dataset',
          dataViewId: DATA_VIEW_ID,
        },
      },
      'control-3': {
        order: 3,
        width: 'medium',
        type: 'optionsListControl',
        explicitInput: {
          id: 'control-3',
          fieldName: 'evaluator.name',
          title: 'Evaluator',
          dataViewId: DATA_VIEW_ID,
        },
      },
    },
  };

  const references = panels.map((panel) => ({
    type: 'lens',
    id: panel.id,
    name: `panel_${panel.gridData.i}`,
  }));

  return {
    type: 'dashboard',
    id: SAVED_OBJECT_IDS.dashboard,
    attributes: {
      title: '@kbn/evals Dashboard',
      description:
        'Evaluation scores overview: trends, model comparison, pass rates, and per-suite breakdowns.',
      panelsJSON: JSON.stringify(panelsJSON),
      controlGroupInput,
      timeRestore: true,
      timeTo: 'now',
      timeFrom: 'now-30d',
      refreshInterval: { pause: true, value: 0 },
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { language: 'kuery', query: '' },
          filter: [],
        }),
      },
    },
    references,
  };
};

/**
 * Returns all saved objects (data view + visualizations + dashboard) that make up
 * the @kbn/evals evaluation dashboard.
 */
export const generateSavedObjects = (): SavedObject[] => [
  buildDataView(),
  buildScoreTrend(),
  buildModelComparison(),
  buildEvaluatorHeatmap(),
  buildPassRate(),
  buildTokenUsage(),
  buildLatencyDistribution(),
  buildRegressionHighlight(),
  buildPerSuiteBreakdown(),
  buildDashboard(),
];

/**
 * Serialises the saved objects to NDJSON for the Kibana saved objects import API.
 */
export const generateNdjson = (): string =>
  generateSavedObjects()
    .map((obj) => JSON.stringify(obj))
    .join('\n');

/**
 * Returns the list of all deterministic saved-object IDs managed by this module,
 * useful for cleanup / deletion.
 */
export const getAllManagedIds = (): Array<{ type: string; id: string }> =>
  generateSavedObjects().map(({ type, id }) => ({ type, id }));
