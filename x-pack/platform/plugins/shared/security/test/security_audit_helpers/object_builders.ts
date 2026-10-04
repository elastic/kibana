/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds a deeply-nested saved object attribute tree used by the OOM and perf suites.
 * Each panel adds several leaf pointers, so the diff engine walks thousands of JSON Pointer
 * paths even for a title-only update.
 */
export const buildNestedAttributes = (title: string, panelCount: number) => {
  const panels: Record<string, unknown> = {};
  for (let i = 0; i < panelCount; i++) {
    panels[`p${i}`] = {
      title: `Panel ${i}`,
      vis: { type: 'histogram', params: { buckets: i, label: `bucket-${i}` } },
    };
  }
  return { title, name: title, panels };
};

/** Builds a single realistic Lens panel (~800 bytes serialized). */
export const buildDashboardPanel = (index: number) => ({
  version: '8.8.0',
  type: 'lens',
  gridData: {
    x: (index % 2) * 24,
    y: Math.floor(index / 2) * 15,
    w: 24,
    h: 15,
    i: `panel-${index}`,
  },
  panelIndex: `panel-${index}`,
  embeddableConfig: {
    attributes: {
      title: `Panel ${index}`,
      visualizationType: 'lnsXY',
      type: 'lens',
      references: [],
      state: {
        visualization: {
          legend: { isVisible: true, position: 'right' },
          valueLabels: 'hide',
          preferredSeriesType: 'bar_stacked',
          layers: [
            {
              layerId: `layer-${index}`,
              accessors: [`y${index}`],
              position: 'top',
              seriesType: 'bar_stacked',
              showGridlines: false,
              xAccessor: `x${index}`,
            },
          ],
        },
        datasourceStates: {
          indexpattern: {
            layers: {
              [`layer-${index}`]: {
                columnOrder: [`x${index}`, `y${index}`],
                columns: {
                  [`x${index}`]: {
                    label: '@timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: '@timestamp',
                    isBucketed: true,
                    scale: 'interval',
                    params: { interval: 'auto', includeEmptyRows: true },
                  },
                  [`y${index}`]: {
                    label: 'Count of records',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                },
              },
            },
          },
        },
        query: { language: 'kuery', query: '' },
        filters: [],
      },
    },
    enhancements: {},
  },
});

/**
 * Builds dashboard saved object attributes with `panelCount` Lens panels serialized into
 * `panelsJSON`. A title-only update holds both the before and after `panelsJSON` strings
 * simultaneously during the diff phase, exercising the large-string allocation path.
 */
export const buildDashboardAttributes = (title: string, panelCount: number) => ({
  title,
  panelsJSON: JSON.stringify(Array.from({ length: panelCount }, (_, i) => buildDashboardPanel(i))),
  optionsJSON: JSON.stringify({ hidePanelTitles: false, useMargins: true }),
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }),
  },
});
