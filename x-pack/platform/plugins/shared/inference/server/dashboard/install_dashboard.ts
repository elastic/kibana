/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsImporter, Logger } from '@kbn/core/server';
import { Readable } from 'stream';

const DATA_VIEW_ID = 'inference-token-usage';
const DASHBOARD_ID = 'inference-token-usage';
const INDEX_PATTERN = '.kibana-inference-token-usage';

export const installTokenUsageDashboard = async (
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger
): Promise<void> => {
  logger.debug(`Installing token usage dashboard assets...`);

  const assets = buildAssets();

  const importResult = await savedObjectsImporter.import({
    readStream: Readable.from(assets),
    managed: true,
    overwrite: true,
    createNewCopies: false,
    refresh: false,
  });

  importResult.warnings.forEach((w) => {
    logger.warn(w.message);
  });

  if (!importResult.success) {
    const errors = (importResult.errors ?? []).map(
      (e) => `Couldn't import "${e.type}:${e.id}": ${JSON.stringify(e.error)}`
    );
    errors.forEach((e) => logger.error(e));
    throw new Error(errors[0] ?? `Unknown error `);
  }

  logger.debug('Token usage dashboard assets installed');
};

function buildAssets() {
  const dataView = buildDataView();
  const dashboard = buildDashboard();
  return [dataView, dashboard];
}

function buildDataView() {
  return {
    type: 'index-pattern',
    id: DATA_VIEW_ID,
    managed: true,
    attributes: {
      name: 'Inference Token Usage',
      title: INDEX_PATTERN,
      timeFieldName: '@timestamp',
    },
    references: [],
  };
}

interface MetricPanelConfig {
  panelId: string;
  title: string;
  field: string;
  x: number;
  y: number;
}

interface XYPanelConfig {
  panelId: string;
  title: string;
  valueField: string;
  splitField: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TablePanelConfig {
  panelId: string;
  title: string;
  bucketField: string;
  bucketLabel: string;
  x: number;
  y: number;
}

function buildMetricPanel({ panelId, title, field, x, y }: MetricPanelConfig) {
  const layerId = `layer-${panelId}`;
  const colMetric = `col-${panelId}-metric`;

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x, y, w: 12, h: 6 },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsMetricNew',
          type: 'lens',
          references: [
            {
              id: DATA_VIEW_ID,
              name: `indexpattern-datasource-layer-${layerId}`,
              type: 'index-pattern',
            },
          ],
          state: {
            visualization: {
              layerId,
              layerType: 'data',
              metricAccessor: colMetric,
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colMetric]: {
                        label: title,
                        dataType: 'number',
                        operationType: 'sum',
                        sourceField: field,
                        isBucketed: false,
                        scale: 'ratio',
                        params: { emptyAsNull: true },
                        customLabel: true,
                      },
                    },
                    columnOrder: [colMetric],
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [
      {
        id: DATA_VIEW_ID,
        name: `${panelId}:indexpattern-datasource-layer-${layerId}`,
        type: 'index-pattern',
      },
    ],
  };
}

function buildCountMetricPanel() {
  const panelId = 'total-requests';
  const layerId = `layer-${panelId}`;
  const colMetric = `col-${panelId}-metric`;
  const title = 'Total requests';

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x: 36, y: 0, w: 12, h: 6 },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsMetricNew',
          type: 'lens',
          references: [
            {
              id: DATA_VIEW_ID,
              name: `indexpattern-datasource-layer-${layerId}`,
              type: 'index-pattern',
            },
          ],
          state: {
            visualization: {
              layerId,
              layerType: 'data',
              metricAccessor: colMetric,
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colMetric]: {
                        label: title,
                        dataType: 'number',
                        operationType: 'count',
                        isBucketed: false,
                        scale: 'ratio',
                        sourceField: '___records___',
                        params: { emptyAsNull: true },
                        customLabel: true,
                      },
                    },
                    columnOrder: [colMetric],
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [
      {
        id: DATA_VIEW_ID,
        name: `${panelId}:indexpattern-datasource-layer-${layerId}`,
        type: 'index-pattern',
      },
    ],
  };
}

function buildXYPanel({ panelId, title, valueField, splitField, x, y, w, h }: XYPanelConfig) {
  const layerId = `layer-${panelId}`;
  const colTimestamp = `col-${panelId}-timestamp`;
  const colValue = `col-${panelId}-value`;
  const colSplit = `col-${panelId}-split`;

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x, y, w, h },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsXY',
          type: 'lens',
          references: [
            {
              id: DATA_VIEW_ID,
              name: `indexpattern-datasource-layer-${layerId}`,
              type: 'index-pattern',
            },
          ],
          state: {
            visualization: {
              preferredSeriesType: 'bar_stacked',
              legend: {
                isVisible: true,
                position: 'right',
                showSingleSeries: true,
              },
              valueLabels: 'hide',
              layers: [
                {
                  layerId,
                  seriesType: 'bar_stacked',
                  xAccessor: colTimestamp,
                  splitAccessor: colSplit,
                  accessors: [colValue],
                  layerType: 'data',
                },
              ],
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colTimestamp]: {
                        label: '@timestamp',
                        dataType: 'date',
                        operationType: 'date_histogram',
                        sourceField: '@timestamp',
                        isBucketed: true,
                        scale: 'interval',
                        params: {
                          interval: 'auto',
                          includeEmptyRows: true,
                          dropPartials: false,
                        },
                      },
                      [colValue]: {
                        label: 'Total tokens',
                        dataType: 'number',
                        operationType: 'sum',
                        sourceField: valueField,
                        isBucketed: false,
                        scale: 'ratio',
                        params: { emptyAsNull: true },
                        customLabel: true,
                      },
                      [colSplit]: {
                        label: 'Feature',
                        dataType: 'string',
                        operationType: 'terms',
                        scale: 'ordinal',
                        sourceField: splitField,
                        isBucketed: true,
                        params: {
                          size: 10,
                          orderBy: { type: 'column', columnId: colValue },
                          orderDirection: 'desc',
                          otherBucket: true,
                          missingBucket: false,
                          parentFormat: { id: 'terms' },
                          secondaryFields: [],
                        },
                        customLabel: true,
                      },
                    },
                    columnOrder: [colSplit, colTimestamp, colValue],
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [
      {
        id: DATA_VIEW_ID,
        name: `${panelId}:indexpattern-datasource-layer-${layerId}`,
        type: 'index-pattern',
      },
    ],
  };
}

function buildTablePanel({ panelId, title, bucketField, bucketLabel, x, y }: TablePanelConfig) {
  const layerId = `layer-${panelId}`;
  const colBucket = `col-${panelId}-bucket`;
  const colTotal = `col-${panelId}-total`;
  const colPrompt = `col-${panelId}-prompt`;
  const colCompletion = `col-${panelId}-completion`;

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x, y, w: 24, h: 12 },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsDatatable',
          type: 'lens',
          references: [
            {
              id: DATA_VIEW_ID,
              name: `indexpattern-datasource-layer-${layerId}`,
              type: 'index-pattern',
            },
          ],
          state: {
            visualization: {
              layerId,
              layerType: 'data',
              columns: [
                { columnId: colBucket, isTransposed: false },
                { columnId: colTotal, isTransposed: false },
                { columnId: colPrompt, isTransposed: false },
                { columnId: colCompletion, isTransposed: false },
              ],
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colBucket]: {
                        label: bucketLabel,
                        dataType: 'string',
                        operationType: 'terms',
                        scale: 'ordinal',
                        sourceField: bucketField,
                        isBucketed: true,
                        params: {
                          size: 20,
                          orderBy: { type: 'column', columnId: colTotal },
                          orderDirection: 'desc',
                          otherBucket: true,
                          missingBucket: false,
                          parentFormat: { id: 'terms' },
                          secondaryFields: [],
                        },
                        customLabel: true,
                      },
                      [colTotal]: {
                        label: 'Total tokens',
                        dataType: 'number',
                        operationType: 'sum',
                        sourceField: 'token_usage.total_tokens',
                        isBucketed: false,
                        scale: 'ratio',
                        params: { emptyAsNull: true },
                        customLabel: true,
                      },
                      [colPrompt]: {
                        label: 'Prompt tokens',
                        dataType: 'number',
                        operationType: 'sum',
                        sourceField: 'token_usage.prompt_tokens',
                        isBucketed: false,
                        scale: 'ratio',
                        params: { emptyAsNull: true },
                        customLabel: true,
                      },
                      [colCompletion]: {
                        label: 'Completion tokens',
                        dataType: 'number',
                        operationType: 'sum',
                        sourceField: 'token_usage.completion_tokens',
                        isBucketed: false,
                        scale: 'ratio',
                        params: { emptyAsNull: true },
                        customLabel: true,
                      },
                    },
                    columnOrder: [colBucket, colTotal, colPrompt, colCompletion],
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [
      {
        id: DATA_VIEW_ID,
        name: `${panelId}:indexpattern-datasource-layer-${layerId}`,
        type: 'index-pattern',
      },
    ],
  };
}

function buildDashboard() {
  const panels = [
    buildMetricPanel({
      panelId: 'total-tokens',
      title: 'Total tokens',
      field: 'token_usage.total_tokens',
      x: 0,
      y: 0,
    }),
    buildMetricPanel({
      panelId: 'prompt-tokens',
      title: 'Prompt tokens',
      field: 'token_usage.prompt_tokens',
      x: 12,
      y: 0,
    }),
    buildMetricPanel({
      panelId: 'completion-tokens',
      title: 'Completion tokens',
      field: 'token_usage.completion_tokens',
      x: 24,
      y: 0,
    }),
    buildCountMetricPanel(),
    buildXYPanel({
      panelId: 'tokens-over-time',
      title: 'Token usage over time by feature',
      valueField: 'token_usage.total_tokens',
      splitField: 'inference.feature_id',
      x: 0,
      y: 6,
      w: 48,
      h: 15,
    }),
    buildTablePanel({
      panelId: 'tokens-by-feature',
      title: 'Token usage by feature',
      bucketField: 'inference.feature_id',
      bucketLabel: 'Feature',
      x: 0,
      y: 21,
    }),
    buildTablePanel({
      panelId: 'tokens-by-model',
      title: 'Token usage by model',
      bucketField: 'model.model_id',
      bucketLabel: 'Model',
      x: 24,
      y: 21,
    }),
  ];

  const allReferences = panels.flatMap((p) => p.references);
  const panelsJSON = panels.map((p) => p.panel);

  return {
    type: 'dashboard',
    id: DASHBOARD_ID,
    managed: true,
    attributes: {
      title: '[Elastic] Inference Token Usage',
      description:
        'Overview of LLM token usage across features, models, and connectors in the Kibana inference plugin.',
      version: 1,
      timeRestore: true,
      timeFrom: 'now-1y',
      timeTo: 'now',
      optionsJSON: JSON.stringify({
        useMargins: true,
        syncColors: false,
        syncCursor: true,
        syncTooltips: false,
        hidePanelTitles: false,
      }),
      panelsJSON: JSON.stringify(panelsJSON),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          filter: [],
          query: { query: '', language: 'kuery' },
        }),
      },
    },
    references: allReferences,
  };
}
