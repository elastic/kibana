/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';

/**
 * Resolves a datemath expression (e.g. "now-2w", "now", or an ISO string)
 * to an ISO 8601 timestamp string that ES|QL can parse.
 */
function resolveDateMath(value: string, roundUp: boolean = false): string {
  const parsed = dateMath.parse(value, { roundUp });
  if (!parsed || !parsed.isValid()) {
    return value;
  }
  return parsed.toISOString();
}

/**
 * Builds ES|QL named parameter entries for `_tstart` and `_tend`
 * from a time range, resolving any datemath expressions to absolute ISO timestamps.
 *
 * Returns `undefined` if no time range is provided.
 */
export function buildTimeRangeParams(
  timeRange: TimeRange | undefined
): Array<Record<string, FieldValue>> | undefined {
  if (!timeRange) {
    return undefined;
  }
  return [
    { _tstart: resolveDateMath(timeRange.from, false) },
    { _tend: resolveDateMath(timeRange.to, true) },
  ];
}
