/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { ChartData } from '@kbn/isomer';

export type ChartColumnType = ChartData['columns'][number]['type'];
export type ChartColumnRole = ChartData['columns'][number]['role'];

/**
 * What a chart column's `source` carries: the Kibana `Datatable` column it came from, so a
 * Kibana host or `filtersForSelection` can rebuild the table a selection refers to.
 */
export interface KibanaColumnSource {
  kind: 'kibana-datatable-column';
  column: DatatableColumn;
}

/** What a chart's `data.source` carries: the Kibana `Datatable`'s own meta. */
export interface KibanaTableSource {
  kind: 'kibana-datatable';
  meta?: Datatable['meta'];
}

export const isKibanaColumnSource = (source: unknown): source is KibanaColumnSource =>
  typeof source === 'object' &&
  source !== null &&
  (source as KibanaColumnSource).kind === 'kibana-datatable-column' &&
  typeof (source as KibanaColumnSource).column === 'object';

export const isKibanaTableSource = (source: unknown): source is KibanaTableSource =>
  typeof source === 'object' &&
  source !== null &&
  (source as KibanaTableSource).kind === 'kibana-datatable';
