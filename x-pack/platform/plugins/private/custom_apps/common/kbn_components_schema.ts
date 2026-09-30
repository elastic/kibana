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
    horizontal: {
      type: 'boolean',
      default: false,
      description:
        'Draws bars horizontally. Prefer this when x holds names rather than times, since a dozen labels will not fit under a vertical axis.',
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

export const KBN_CUSTOM_CONTENT_PANEL_SCHEMA = {
  type: 'object',
  description:
    'LAST RESORT for a visualization no other component can draw. Always prefer Chart, then KbnLensPanel, then StatusGrid. Themed HTML/SVG with Liquid over an ES|QL result; sandboxed, so no JavaScript, no links, and no way to call back into the app.',
  properties: {
    component: { const: 'KbnCustomContentPanel' },
    template: {
      type: 'string',
      description:
        "HTML and CSS with Liquid tags. `rows` is the ES|QL result; `row['col'].value` is a cell and `row['col'].pct` is its percentage of that column's maximum, which is what bar widths want.",
    },
    esql: {
      type: 'string',
      description:
        'The query whose rows the template iterates. The page time range is applied automatically.',
    },
    height: {
      type: 'number',
      description: 'Panel height in pixels; defaults to filling the panel.',
    },
  },
  required: ['component', 'template'],
} as const;

export const STATUS_GRID_SCHEMA = {
  type: 'object',
  description:
    'One shape per entity, coloured by status — a honeycomb. For hundreds of pods or hosts at once, when clicking one must do something; for a static picture use KbnCustomContentPanel.',
  properties: {
    component: { const: 'StatusGrid' },
    cells: {
      $ref: 'common_types.json#/$defs/DynamicValue',
      description: 'Array of row objects, normally an ES|QL result such as {"path": "/pods"}.',
    },
    labelField: {
      type: 'string',
      description: "Key holding each cell's name, used as its accessible label.",
    },
    statusField: { type: 'string', description: 'Key holding the status token.' },
    statuses: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
          color: {
            type: 'string',
            enum: ['success', 'warning', 'danger', 'primary', 'accent', 'subdued'],
          },
        },
        required: ['value', 'color'],
        additionalProperties: false,
      },
    },
    defaultColor: {
      type: 'string',
      enum: ['success', 'warning', 'danger', 'primary', 'accent', 'subdued'],
      default: 'subdued',
    },
    shape: { type: 'string', enum: ['hex', 'square'], default: 'hex' },
    columns: { type: 'number', description: 'Cells per row. Defaults to ceil(sqrt(n) * 1.3).' },
    maxCellSize: { type: 'number', default: 34 },
    maxCells: { type: 'number', default: 2000 },
    action: {
      $ref: 'common_types.json#/$defs/Action',
      description:
        'Dispatched on click or Enter with the clicked row merged into the context as `row`.',
    },
  },
  required: ['component', 'cells', 'labelField', 'statusField', 'statuses'],
} as const;

export const METRIC_CHART_SCHEMA = {
  type: 'object',
  description:
    "A row of metric tiles — Elastic Charts' metric visualization, the same one Lens draws. Prefer this over Stat for headline numbers: a tile can carry a colour and a sparkline of how the value got there.",
  properties: {
    component: { const: 'MetricChart' },
    metrics: {
      type: 'array',
      minItems: 1,
      description: 'One entry per tile, left to right.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          subtitle: { type: 'string' },
          value: {
            $ref: 'common_types.json#/$defs/DynamicNumber',
            description: 'Normally a binding such as {"path": "/fleet/pods"}.',
          },
          format: {
            type: 'string',
            enum: ['number', 'percent', 'bytes', 'duration'],
            default: 'number',
          },
          color: {
            type: 'string',
            enum: ['primary', 'success', 'warning', 'danger', 'accent', 'subdued'],
            default: 'primary',
            description:
              'Colours the value, and the sparkline when there is one. Tiles keep the plain panel background.',
          },
          trendRows: {
            $ref: 'common_types.json#/$defs/DynamicValue',
            description:
              'Optional rows for a background sparkline, from a query bucketed over time.',
          },
          trendX: { type: 'string', description: 'Column in trendRows holding the timestamp.' },
          trendY: { type: 'string', description: 'Column in trendRows holding the value.' },
        },
        required: ['title', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['component', 'metrics'],
} as const;
