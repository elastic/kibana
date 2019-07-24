/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
watch.metadata
 */

export function buildMetadata(watch) {
  return {
    watcherui: {
      index: watch.index,
      time_field: watch.timeField,
      trigger_interval_size: watch.triggerIntervalSize,
      trigger_interval_unit: watch.triggerIntervalUnit,
      agg_type: watch.aggType,
      agg_field: watch.aggField,
      term_size: watch.termSize,
      term_field: watch.termField,
      threshold_comparator: watch.thresholdComparator,
      time_window_size: watch.timeWindowSize,
      time_window_unit: watch.timeWindowUnit,
      threshold: watch.threshold
    }
  };
}
