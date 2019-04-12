/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { parseInterval } from 'plugins/ml/../common/util/parse_interval';

// ensure the displayed interval is never smaller than the bucketSpan
// otherwise the model plot bounds can be drawn in the wrong place.
// this only really affects small jobs when using sum
export function adjustIntervalDisplayed(formConfig) {
  let makeTheSame = false;
  const intervalSeconds = formConfig.chartInterval.getInterval().asSeconds();
  const bucketSpan = parseInterval(formConfig.bucketSpan);

  if (bucketSpan !== null) {
    if (bucketSpan.asSeconds() > intervalSeconds) {
      makeTheSame = true;
    }

    if (formConfig.agg.type !== undefined) {
      const mlName = formConfig.agg.type.mlName;
      if (mlName === 'count' ||
      mlName === 'low_count' ||
      mlName === 'high_count' ||
      mlName === 'distinct_count') {
        makeTheSame = true;
      }
    }

    if (makeTheSame) {
      formConfig.chartInterval.setInterval(formConfig.bucketSpan);
    }
  }
}
