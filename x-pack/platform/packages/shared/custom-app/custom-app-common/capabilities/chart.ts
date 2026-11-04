/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { actionsSchema } from '../action_schemas';
import { annotationsVisibleSchema, bindable, chartTypeSchema } from '../bindings';
import { ANNOTATIONS_SOURCE_SUFFIX, MAX_HEADING_LENGTH } from '../constants';
import { querySchema } from '../data_fields';
import { defineCapability } from './define_capability';

export const chartCapability = defineCapability({
  kind: 'component',
  id: 'chart',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('A heading above the chart. It may use {{state.key}}.'),
      query: querySchema.describe(
        'An ES|QL query. Name the columns so the chart reads well: for a time series a date column then the numbers, for a breakdown a category then a number.'
      ),
      chartType: bindable(chartTypeSchema).describe(
        'bar, line, area or donut. Left out, the chart is suggested from the columns of the query.'
      ),
      annotations: z
        .object({
          query: querySchema.describe('An ES|QL query with one row for each moment to mark.'),
          time: z
            .string()
            .min(1)
            .max(MAX_HEADING_LENGTH)
            .describe('The column that holds when it happened.'),
          label: z
            .string()
            .min(1)
            .max(MAX_HEADING_LENGTH)
            .optional()
            .describe('The column that names the moment.'),
          visible: bindable(annotationsVisibleSchema).describe(
            'Whether they are shown. It can be a boolean value of the app, bound to a switch.'
          ),
        })
        .optional()
        .describe('Moments to mark on a chart that is over time, from a query of their own.'),
      onClick: actionsSchema
        .default([])
        .describe(
          'The actions to run when a bar, a point or a slice is clicked, with the row behind it.'
        ),
    })
  ),
  doc: {
    summary:
      'a chart of its query. Leave chartType out and Lens picks the chart from the columns: for a time series return a date column then the numbers; for a breakdown return a category then a number. Name the columns in the query so the chart reads well. With "onClick", clicking a bar, a point or a slice runs the actions with the row of the query behind it, so { "type": "setState", "key": "user", "value": { "fromColumn": "user.name" } } makes a click on a bar filter the other components by that user, as a table row click does; a chart split by a series gives both the bar and the series in the same row. Use it to let people pivot from a chart, and keep a way to clear the value (an "All" option of a select that sets the same value). "annotations" marks moments on a chart that is over time, such as deployments or incidents: its own ES|QL query returns one row for each moment, "time" is the column that holds when it happened and "label" the column that names it. Set "visible" to { "$state": "<a boolean value>" } and add a switch bound to that value, to let people turn the annotations on and off.',
    whenToUse: 'For numbers over time or a breakdown. For a single figure use stat.',
    example: {
      type: 'chart',
      id: 'errors_over_time',
      title: 'Errors over time',
      query: 'FROM logs-* | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 hour)',
    },
  },
  interpolated: ['title'],
  bound: {
    chartType: { schema: chartTypeSchema, kind: 'string' },
    'annotations.visible': { schema: annotationsVisibleSchema, kind: 'boolean' },
  },
  events: { onChartClick: 'onClick' },
  sources: (node) =>
    node.annotations === undefined
      ? []
      : [{ suffix: ANNOTATIONS_SOURCE_SUFFIX, query: node.annotations.query }],
  data: 'query',
});
