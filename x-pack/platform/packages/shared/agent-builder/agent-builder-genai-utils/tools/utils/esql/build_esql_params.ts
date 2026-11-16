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

/** The named parameters to execute a query with: the time range, and the values of the controls the query uses. */
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
  // Looked up in the query, since a retry can add or drop a variable.
  const variableParams = getNamedParams(query, undefined, esqlVariables) as Array<
    Record<string, FieldValue>
  >;
  const params = [...timeParams, ...variableParams];
  return params.length > 0 ? params : undefined;
}
