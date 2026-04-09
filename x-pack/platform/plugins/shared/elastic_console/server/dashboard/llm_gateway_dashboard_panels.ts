/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Lens / dashboard panel serialization version (migrations upgrade on load). */
const DASHBOARD_PANEL_VERSION = '10.2.0';

const indexPatternRefs = (dataViewId: string, layerId: string) => [
  {
    type: 'index-pattern' as const,
    id: dataViewId,
    name: 'indexpattern-datasource-current-indexpattern',
  },
  {
    type: 'index-pattern' as const,
    id: dataViewId,
    name: `indexpattern-datasource-layer-${layerId}`,
  },
];

const xyCommonVisualizationChrome = {
  legend: { isVisible: true, position: 'right' as const },
  valueLabels: 'hide' as const,
  fittingFunction: 'None' as const,
  axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
  tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
  gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
};

function lensByValuePanel(args: {
  title: string;
  grid: { x: number; y: number; w: number; h: number };
  panelIndex: string;
  visualizationType: string;
  state: Record<string, unknown>;
  references: Array<{ type: 'index-pattern'; id: string; name: string }>;
}) {
  return {
    version: DASHBOARD_PANEL_VERSION,
    type: 'lens' as const,
    gridData: {
      x: args.grid.x,
      y: args.grid.y,
      w: args.grid.w,
      h: args.grid.h,
      i: args.panelIndex,
    },
    panelIndex: args.panelIndex,
    embeddableConfig: {
      title: args.title,
      hidePanelTitles: false,
      enhancements: {},
      attributes: {
        title: '',
        description: '',
        visualizationType: args.visualizationType,
        type: 'lens',
        state: args.state,
        references: args.references,
      },
    },
  };
}

/**
 * Builds dashboard panelsJSON for LLM gateway telemetry (Lens by-value, form-based data view datasource).
 */
export function buildLlmGatewayDashboardPanelsJson(dataViewId: string): string {
  // Stable layout ids (one-time install; avoids churn in git diffs)
  const pCompletions = 'ramen-llm-p1-completions-9142-4c6a-9f3e-8a1b2c3d4e50';
  const pTokenVol = 'ramen-llm-p2-tokenvol-9142-4c6a-9f3e-8a1b2c3d4e51';
  const pCache = 'ramen-llm-p3-cache-9142-4c6a-9f3e-8a1b2c3d4e52';
  const pModels = 'ramen-llm-p4-models-9142-4c6a-9f3e-8a1b2c3d4e53';
  const pOutcome = 'ramen-llm-p5-outcome-9142-4c6a-9f3e-8a1b2c3d4e54';
  const pTools = 'ramen-llm-p6-tools-9142-4c6a-9f3e-8a1b2c3d4e55';

  const lCompletions = 'layer-ramen-completions-0a1b2c3d4e5f6789';
  const lTokenVol = 'layer-ramen-tokenvol-0a1b2c3d4e5f678a';
  const lCache = 'layer-ramen-cache-0a1b2c3d4e5f678b';
  const lModels = 'layer-ramen-models-0a1b2c3d4e5f678c';
  const lOutcome = 'layer-ramen-outcome-0a1b2c3d4e5f678d';
  const lTools = 'layer-ramen-tools-0a1b2c3d4e5f678e';

  const cTs1 = 'col-ts-comp-11111111-1111-4111-8111-111111111111';
  const cCnt1 = 'col-cnt-comp-22222222-2222-4222-8222-222222222222';
  const cTs2 = 'col-ts-tok-33333333-3333-4333-8333-333333333333';
  const cIn2 = 'col-sum-in-44444444-4444-4444-8444-444444444444';
  const cOut2 = 'col-sum-out-55555555-5555-4555-8555-555555555555';
  const cTs3 = 'col-ts-cache-66666666-6666-4666-8666-666666666666';
  const cCache3 = 'col-sum-cache-77777777-7777-4777-8777-777777777777';
  const cUnc3 = 'col-sum-unc-88888888-8888-4888-8888-888888888888';
  const cModel4 = 'col-terms-model-99999999-9999-4999-8999-999999999999';
  const cCnt4 = 'col-cnt-model-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const cOutcome5 = 'col-terms-out-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const cCnt5 = 'col-cnt-out-cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const cTs6 = 'col-ts-tools-dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const cAvgTools6 = 'col-avg-tools-eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  const completions = lensByValuePanel({
    title: 'Completions over time',
    grid: { x: 0, y: 0, w: 48, h: 11 },
    panelIndex: pCompletions,
    visualizationType: 'lnsXY',
    references: indexPatternRefs(dataViewId, lCompletions),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [lCompletions]: {
              columnOrder: [cTs1, cCnt1],
              columns: {
                [cTs1]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto', includeEmptyRows: false },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [cCnt1]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        ...xyCommonVisualizationChrome,
        preferredSeriesType: 'line',
        layers: [
          {
            layerId: lCompletions,
            layerType: 'data',
            accessors: [cCnt1],
            seriesType: 'line',
            xAccessor: cTs1,
          },
        ],
      },
    },
  });

  const tokenVolume = lensByValuePanel({
    title: 'Input / output tokens (sum over time)',
    grid: { x: 0, y: 11, w: 48, h: 12 },
    panelIndex: pTokenVol,
    visualizationType: 'lnsXY',
    references: indexPatternRefs(dataViewId, lTokenVol),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [lTokenVol]: {
              columnOrder: [cTs2, cIn2, cOut2],
              columns: {
                [cTs2]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto', includeEmptyRows: false },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [cIn2]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Sum of input tokens',
                  operationType: 'sum',
                  scale: 'ratio',
                  sourceField: 'gen_ai.usage.input_tokens',
                },
                [cOut2]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Sum of output tokens',
                  operationType: 'sum',
                  scale: 'ratio',
                  sourceField: 'gen_ai.usage.output_tokens',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        ...xyCommonVisualizationChrome,
        preferredSeriesType: 'area',
        layers: [
          {
            layerId: lTokenVol,
            layerType: 'data',
            accessors: [cIn2, cOut2],
            seriesType: 'area',
            xAccessor: cTs2,
          },
        ],
      },
    },
  });

  const cacheSplit = lensByValuePanel({
    title: 'Cached vs non-cached prompt tokens (sum)',
    grid: { x: 0, y: 23, w: 24, h: 12 },
    panelIndex: pCache,
    visualizationType: 'lnsXY',
    references: indexPatternRefs(dataViewId, lCache),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [lCache]: {
              columnOrder: [cTs3, cCache3, cUnc3],
              columns: {
                [cTs3]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto', includeEmptyRows: false },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [cCache3]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Sum of cache_read_tokens',
                  operationType: 'sum',
                  scale: 'ratio',
                  sourceField: 'gen_ai.usage.cache_read_tokens',
                },
                [cUnc3]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Sum of non_cached_input_tokens',
                  operationType: 'sum',
                  scale: 'ratio',
                  sourceField: 'gen_ai.usage.non_cached_input_tokens',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        ...xyCommonVisualizationChrome,
        preferredSeriesType: 'area',
        layers: [
          {
            layerId: lCache,
            layerType: 'data',
            accessors: [cCache3, cUnc3],
            seriesType: 'area',
            xAccessor: cTs3,
          },
        ],
      },
    },
  });

  const topModels = lensByValuePanel({
    title: 'Top request models',
    grid: { x: 24, y: 23, w: 24, h: 12 },
    panelIndex: pModels,
    visualizationType: 'lnsXY',
    references: indexPatternRefs(dataViewId, lModels),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [lModels]: {
              columnOrder: [cModel4, cCnt4],
              columns: {
                [cModel4]: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Top values of elastic_ramen.model',
                  operationType: 'terms',
                  params: {
                    size: 10,
                    orderBy: { type: 'column', columnId: cCnt4 },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                  },
                  scale: 'ordinal',
                  sourceField: 'elastic_ramen.model',
                },
                [cCnt4]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        ...xyCommonVisualizationChrome,
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: lModels,
            layerType: 'data',
            accessors: [cCnt4],
            seriesType: 'bar_stacked',
            xAccessor: cModel4,
          },
        ],
      },
    },
  });

  const outcomeDonut = lensByValuePanel({
    title: 'Outcomes',
    grid: { x: 0, y: 35, w: 16, h: 12 },
    panelIndex: pOutcome,
    visualizationType: 'lnsPie',
    references: indexPatternRefs(dataViewId, lOutcome),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [lOutcome]: {
              columnOrder: [cOutcome5, cCnt5],
              columns: {
                [cOutcome5]: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'event.outcome',
                  operationType: 'terms',
                  params: {
                    size: 5,
                    orderBy: { type: 'column', columnId: cCnt5 },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                  },
                  scale: 'ordinal',
                  sourceField: 'event.outcome',
                },
                [cCnt5]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        shape: 'donut',
        layers: [
          {
            layerId: lOutcome,
            layerType: 'data',
            primaryGroups: [cOutcome5],
            metrics: [cCnt5],
            numberDisplay: 'percent',
            categoryDisplay: 'default',
            legendDisplay: 'default',
            nestedLegend: false,
          },
        ],
      },
    },
  });

  const toolCalls = lensByValuePanel({
    title: 'Average tool calls per completion',
    grid: { x: 16, y: 35, w: 32, h: 12 },
    panelIndex: pTools,
    visualizationType: 'lnsXY',
    references: indexPatternRefs(dataViewId, lTools),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [lTools]: {
              columnOrder: [cTs6, cAvgTools6],
              columns: {
                [cTs6]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto', includeEmptyRows: false },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [cAvgTools6]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Average of elastic_ramen.tool_call_count',
                  operationType: 'average',
                  scale: 'ratio',
                  sourceField: 'elastic_ramen.tool_call_count',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        ...xyCommonVisualizationChrome,
        preferredSeriesType: 'line',
        layers: [
          {
            layerId: lTools,
            layerType: 'data',
            accessors: [cAvgTools6],
            seriesType: 'line',
            xAccessor: cTs6,
          },
        ],
      },
    },
  });

  return JSON.stringify([completions, tokenVolume, cacheSplit, topModels, outcomeDonut, toolCalls]);
}
