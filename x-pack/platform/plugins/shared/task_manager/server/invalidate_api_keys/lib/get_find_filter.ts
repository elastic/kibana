/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timePeriodBeforeDate } from '../../lib/intervals';

interface GetFindFilterOpts {
  removalDelay: string;
  excludedSOIds?: string[];
  savedObjectType: string;
}
export function getFindFilter(opts: GetFindFilterOpts): string {
  const { removalDelay, excludedSOIds = [], savedObjectType } = opts;
  const delay: string = timePeriodBeforeDate(new Date(), removalDelay).toISOString();
  let filter = `${savedObjectType}.attributes.createdAt <= "${delay}"`;

  if (excludedSOIds.length > 0) {
    const excluded = [...new Set(excludedSOIds)];
    const excludedSOIdFilter = (excluded ?? []).map(
      (id: string) => `NOT ${savedObjectType}.id: "${savedObjectType}:${id}"`
    );
    filter += ` AND ${excludedSOIdFilter.join(' AND ')}`;
  }
  return filter;
}
