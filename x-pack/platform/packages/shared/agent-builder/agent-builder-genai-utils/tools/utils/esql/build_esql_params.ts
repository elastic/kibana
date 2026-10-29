/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getNamedParams } from '@kbn/esql-utils';
import { buildTimeRangeParams } from './build_time_range_params';

/**
 * The named parameters to execute a query with: the time range (`?_tstart`, `?_tend`), and the
 * values of the dashboard controls (`?name`) the query refers to.
 *
 * The values are looked up in the query, not sent whole, because the query is not the same on every
 * attempt of a generation: a retry can add or drop a variable. A query that refers to a control
 * cannot run without its value, so a caller that has the values must pass them.
 *
 * Returns `undefined` when there is nothing to bind.
 */
export function buildEsqlParams({
  query,
  timeRange,
  esqlVariables,
}: {
  query: string;
  timeRange?: TimeRange;
  esqlVariables?: ESQLControlVariable[];
}): Array<Record<string, FieldValue>> | undefined {
  const timeParams = buildTimeRangeParams(timeRange) ?? [];
  // No time range here: the time parameters above are always sent, as they have always been.
  const variableParams = esqlVariables?.length
    ? (getNamedParams(query, undefined, esqlVariables) as Array<Record<string, FieldValue>>)
    : [];
  const params = [...timeParams, ...variableParams];
  return params.length > 0 ? params : undefined;
}
