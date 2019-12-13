/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { LISTING_METRICS_NAMES } from './nodes/get_nodes/nodes_listing_metrics';

// We should use some explicit prefix for the converted aggregation name
// so we can easily strip them out later (see `convertMetricNames` and `uncovertMetricNames`)
const CONVERTED_TOKEN = `odh_`;

/**
 * This work stemmed from this issue: https://github.com/elastic/kibana/issues/43477
 *
 * Historically, the `get_nodes` function created an aggregation with multiple sub `date_histogram`
 * aggregations for each metric aggregation. From a top down view, the entire aggregations look liked:
 * `terms` agg -> [`date_histogram` -> metric agg]x6
 * However, this is very inefficient, as each `date_histogram` will create a new set of search buckets
 * unnecessarily and users will hit the `search.max_buckets` ceiling sooner.
 *
 * To solve this, we need to create a single `date_histogram`, then perform each metric agg as a sub aggregations
 * of this single `date_histogram`. This is not straightforward though. The logic to build these aggregations
 * is shared code between the rest of the monitoring code base and is not easily updated to accommodate the
 * changes from above. To circumvent that, this function will adjust the existing aggregation names to work
 * for a single date_histogram.
 *
 * @param string prefix - This is the aggregation name prefix where the rest of the name will be the type of aggregation
 * @param object metricObj The metric aggregation itself
 */
export function convertMetricNames(prefix, metricObj) {
  return Object.entries(metricObj).reduce((newObj, [key, value]) => {
    const newValue = cloneDeep(value);
    if (key.includes('_deriv') && newValue.derivative) {
      newValue.derivative.buckets_path = `${CONVERTED_TOKEN}${prefix}__${newValue.derivative.buckets_path}`;
    }
    newObj[`${CONVERTED_TOKEN}${prefix}__${key}`] = newValue;
    return newObj;
  }, {});
}

/**
 * Building upon the comment for `convertMetricNames`, we are dynamically changing the aggregation names to allow
 * the single `date_histogram` to work properly. Unfortunately, the code that looks at the response also needs to
 * understand the naming changes. And yet again, this code is shared amongst the rest of the monitoring code base.
 * To circumvent this, we need to convert the changed aggregation names back to the original, expected names.
 * This feels messy, but possible because we keep the original name in the converted aggregation name.
 *
 * @param object byDateBucketResponse - The response object from the single `date_histogram` bucket
 */
export function uncovertMetricNames(byDateBucketResponse) {
  const unconverted = {};
  for (const metricName of LISTING_METRICS_NAMES) {
    unconverted[metricName] = {
      buckets: byDateBucketResponse.buckets.map(bucket => {
        const {
          key_as_string,
          key,
          doc_count,
          ...rest
        } = bucket; /* eslint-disable-line camelcase */
        const metrics = Object.entries(rest).reduce((accum, [key, value]) => {
          if (key.startsWith(`${CONVERTED_TOKEN}${metricName}`)) {
            const name = key.split('__')[1];
            accum[name] = value;
          }
          return accum;
        }, {});

        return {
          key_as_string /* eslint-disable-line camelcase */,
          key,
          doc_count /* eslint-disable-line camelcase */,
          ...metrics,
        };
      }),
    };
  }
  return unconverted;
}
