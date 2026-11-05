/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { ESQLColumn } from '@kbn/es-types';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ParamMap } from './types';

const TIME_START_PARAM = '_tstart';
const TIME_END_PARAM = '_tend';

export interface TemplateData {
  columns: ESQLColumn[];
  rows: unknown[][];
}

/** A cell's table in the column-and-row-array shape custom panel templates are filled from. */
export const toTemplateData = ({ columns, rows }: Datatable): TemplateData => ({
  columns: columns.map(({ name, meta }) => ({ name, type: meta.esType ?? meta.type })),
  rows: rows.map((row) => columns.map(({ id }) => row[id])),
});

export interface QueryContext {
  timeRange?: TimeRange;
  esqlVariables: ESQLControlVariable[];
}

/** The params a query last ran with, as the time range and variables a chat preview re-runs it with. */
export const toQueryContext = (params: ParamMap = {}): QueryContext => {
  const { [TIME_START_PARAM]: from, [TIME_END_PARAM]: to, ...rest } = params;
  return {
    timeRange: typeof from === 'string' && typeof to === 'string' ? { from, to } : undefined,
    esqlVariables: Object.entries(rest).flatMap(([key, value]) =>
      value === null ? [] : [{ key, value, type: ESQLVariableType.VALUES }]
    ),
  };
};
