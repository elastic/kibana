/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasStartEndParams } from '@kbn/esql-utils';
import { TimeWindowUnitNames } from '@kbn/response-ops-rule-params/common/utils';

export const replaceTStartTend = (
  query: string | null,
  timeWindowSize: number,
  timeWindowUnit: string
): string | null => {
  if (!query || !hasStartEndParams(query)) return query;

  try {
    const timeWindowUnitName =
      TimeWindowUnitNames[timeWindowUnit as keyof typeof TimeWindowUnitNames];
    if (!timeWindowUnitName) {
      throw new Error(`Invalid time window unit - ${timeWindowUnit}`);
    }

    query = query
      .replaceAll('?_tstart', `NOW() - ${timeWindowSize} ${timeWindowUnitName}`)
      .replaceAll('?_tend', 'NOW()');

    return query;
  } catch (_) {
    // replacing is a best effort, if failure occurs, just return the original query
    return query;
  }
};
