/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INDEX_PATTERN = 'kibana-evaluations*';
const DATA_VIEW_TITLE = 'Evaluation Scores';

export const DASHBOARD_ID = 'evals-dashboard';
export const DATA_VIEW_ID = 'evals-data-view';

interface PanelGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LensPanel {
  uid: string;
  type: 'lens';
  grid: PanelGrid;
  config: {
    title: string;
    visualizationType: string;
    state: {
      datasourceStates: {
        formBased: {
          layers: Record<string, unknown>;
        };
      };
      visualization: Record<string, unknown>;
      filters: unknown[];
      query: { language: string; query: string };
    };
    references: Array<{ type: string; id: string; name: string }>;
  };
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

const makeLensPanel = (
  uid: string,
  title: string,
  grid: PanelGrid,
  visualizationType: string,
  layerId: string,
  columns: Record<string, unknown>,
  columnOrder: string[],
  visualization: Record<string, unknown>
): LensPanel => ({
  uid,
  type: 'lens',
  grid,
  config: {
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
    references: [makeLayerRef(layerId)],
  },
});

const buildScoreTrendPanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-score-trend',
    'Score Trend',
    { x: 0, y: 0, w: 24, h: 15 },
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

const buildModelComparisonPanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-model-comparison',
    'Model Comparison',
    { x: 24, y: 0, w: 24, h: 15 },
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

const buildEvaluatorHeatmapPanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-evaluator-heatmap',
    'Evaluator Heatmap',
    { x: 0, y: 15, w: 24, h: 15 },
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

const buildPassRatePanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-pass-rate',
    'Pass Rate Over Runs',
    { x: 24, y: 15, w: 24, h: 15 },
    'lnsXY',
    layerId,
    columns,
    ['runId', 'passRate'],
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

const buildTokenUsagePanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-token-usage',
    'Token Usage',
    { x: 0, y: 30, w: 24, h: 15 },
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

const buildLatencyDistributionPanel = (): LensPanel => {
  const layerId = 'latency-distribution-layer';
  const columns: Record<string, unknown> = {
    latencyBucket: {
      dataType: 'number',
      isBucketed: true,
      label: 'Latency Score',
      operationType: 'range',
      sourceField: 'evaluator.score',
      params: { type: 'histogram', ranges: [{ from: 0, to: 1, label: '' }], maxBars: 20 },
    },
    count: {
      dataType: 'number',
      isBucketed: false,
      label: 'Count',
      operationType: 'count',
      sourceField: '___records___',
    },
  };

  return makeLensPanel(
    'panel-latency-distribution',
    'Latency Distribution',
    { x: 24, y: 30, w: 24, h: 15 },
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

const buildRegressionHighlightPanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-regression-highlight',
    'Regression Highlight',
    { x: 0, y: 45, w: 12, h: 10 },
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

const buildPerSuiteBreakdownPanel = (): LensPanel => {
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

  return makeLensPanel(
    'panel-per-suite-breakdown',
    'Per-Suite Breakdown',
    { x: 12, y: 45, w: 36, h: 15 },
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

/**
 * Generates the full dashboard request body for the Dashboard REST API.
 * This follows the "dashboard as code" approach using POST /api/dashboards.
 */
export const generateDashboardBody = (): {
  title: string;
  description: string;
  panels: LensPanel[];
  options: Record<string, boolean>;
  time_range: { from: string; to: string };
  pinned_panels: [];
} => ({
  title: '@kbn/evals Dashboard',
  description:
    'Evaluation scores overview: trends, model comparison, pass rates, and per-suite breakdowns.',
  panels: [
    buildScoreTrendPanel(),
    buildModelComparisonPanel(),
    buildEvaluatorHeatmapPanel(),
    buildPassRatePanel(),
    buildTokenUsagePanel(),
    buildLatencyDistributionPanel(),
    buildRegressionHighlightPanel(),
    buildPerSuiteBreakdownPanel(),
  ],
  options: {
    auto_apply_filters: true,
    hide_panel_titles: false,
    hide_panel_borders: false,
    use_margins: true,
    sync_colors: false,
    sync_tooltips: false,
    sync_cursor: true,
  },
  time_range: { from: 'now-30d', to: 'now' },
  pinned_panels: [],
});

/**
 * Generates the data view request body for POST /api/data_views/data_view.
 */
export const generateDataViewBody = (): {
  data_view: {
    id: string;
    title: string;
    name: string;
    timeFieldName: string;
  };
} => ({
  data_view: {
    id: DATA_VIEW_ID,
    title: INDEX_PATTERN,
    name: DATA_VIEW_TITLE,
    timeFieldName: '@timestamp',
  },
});
