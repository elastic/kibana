/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Catalog schema for the plugin's Kibana-backed components. It lives in
 * `common/` because the server needs it to validate agent output and to build
 * the catalog handed to the agent as its prompt, while the implementations are
 * browser-only.
 */
export const KBN_LENS_PANEL_SCHEMA = {
  type: 'object',
  description:
    'Embeds an existing saved Lens visualization by id. Only use this when the user refers to a visualization they already saved; to chart data from a query, use Chart with an ES|QL query instead.',
  properties: {
    component: { const: 'KbnLensPanel' },
    savedObjectId: {
      type: 'string',
      description: 'The saved object id of an existing Lens visualization.',
    },
    attributes: {
      type: 'object',
      description:
        'Inline Lens attributes for a by-value chart. Large and easy to get wrong; prefer savedObjectId, or use Chart.',
    },
  },
  required: ['component'],
  oneOf: [{ required: ['savedObjectId'] }, { required: ['attributes'] }],
} as const;

export const CHART_SCHEMA = {
  type: 'object',
  description:
    'Plots rows from the data model, normally rows an ES|QL query produced. This is the default way to draw a chart.',
  properties: {
    component: { const: 'Chart' },
    chartType: {
      type: 'string',
      enum: ['bar', 'line', 'area'],
      default: 'bar',
      description: 'Use line or area for a value over time, bar for comparing categories.',
    },
    rows: {
      $ref: 'common_types.json#/$defs/DynamicValue',
      description:
        'The rows to plot, normally a binding such as {"path": "/traffic"} pointing at an ES|QL query result.',
    },
    x: {
      type: 'string',
      description: 'Column name for the x axis, exactly as the ES|QL query names it.',
    },
    y: {
      type: 'string',
      description: 'Column name for the y axis, exactly as the ES|QL query names it.',
    },
    breakdown: {
      type: 'string',
      description: 'Optional column name to split the series by.',
    },
    xTitle: { type: 'string' },
    yTitle: { type: 'string' },
  },
  required: ['component', 'rows', 'x', 'y'],
} as const;

export const KBN_TIME_FILTER_SCHEMA = {
  type: 'object',
  description:
    "The app's time range picker. Place it in its own panel near the top; every ES|QL query in the app is filtered by whatever it is set to. Include exactly one per app.",
  properties: {
    component: { const: 'KbnTimeFilter' },
    showUpdateButton: { type: 'boolean', default: true },
    compressed: { type: 'boolean', default: false },
    fullWidth: { type: 'boolean', default: false },
  },
  required: ['component'],
} as const;
