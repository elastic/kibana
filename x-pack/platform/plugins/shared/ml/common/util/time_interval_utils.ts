/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { isDefined } from '@kbn/ml-is-defined';
import { parseInterval } from '@kbn/ml-parse-interval';

/**
 * Resolves the longest time interval from the list.
 * @param timeIntervals Collection of the strings representing time intervals, e.g. ['15m', '1h', '2d']
 */
export function resolveMaxTimeInterval(timeIntervals: estypes.Duration[]): number | undefined {
  const result = Math.max(
    ...timeIntervals
      .map((b) => parseInterval(b))
      .filter(isDefined)
      .map((v) => v.asSeconds())
  );

  return Number.isFinite(result) ? result : undefined;
}
