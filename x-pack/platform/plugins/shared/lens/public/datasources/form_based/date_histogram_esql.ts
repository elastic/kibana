/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { DateHistogramIndexPatternColumn, DateRange, IndexPattern } from '@kbn/lens-common';

export const AUTO_INTERVAL = 'auto';
/**
 * Target bucket count for Lens form-based → ES|QL conversion when the date histogram uses
 * `auto` interval: the generated query uses `BUCKET(field, N, ?_tstart, ?_tend)`, and
 * `generate_esql_query.ts` uses the same N with `calculateAuto.near` so the inferred interval matches
 * the bucket width implied by that `BUCKET` call.
 *
 * `N` is 75, not `histogram:barTarget` (default 50), so ES|QL `BUCKET` and the client-side interval
 * match Lens’s form-based `auto` date_histogram; the default 50 would not.
 */
export const AUTO_TARGET_NUMBER_OF_BUCKETS = 75;
/** Default date histogram interval when auto cannot be used. */
export const DEFAULT_DATE_HISTOGRAM_INTERVAL = '1h';

export const hasDateRange = (dateRange: DateRange | undefined) => {
  return dateRange?.fromDate != null && dateRange?.toDate != null;
};

export function restrictedInterval(aggregationRestrictions?: Partial<IndexPatternAggRestrictions>) {
  if (!aggregationRestrictions || !aggregationRestrictions.date_histogram) {
    return;
  }

  return (
    aggregationRestrictions.date_histogram.calendar_interval ||
    aggregationRestrictions.date_histogram.fixed_interval
  );
}

export function getTimeZoneAndInterval(
  column: DateHistogramIndexPatternColumn,
  indexPattern: IndexPattern
) {
  const usedField = indexPattern.getFieldByName(column.sourceField);

  if (
    usedField &&
    usedField.aggregationRestrictions &&
    usedField.aggregationRestrictions.date_histogram
  ) {
    return {
      interval: restrictedInterval(usedField.aggregationRestrictions) ?? AUTO_INTERVAL,
      timeZone: usedField.aggregationRestrictions.date_histogram.time_zone,
      usedField,
    };
  }
  return {
    usedField: undefined,
    timeZone: undefined,
    interval: column.params?.interval ?? AUTO_INTERVAL,
  };
}
