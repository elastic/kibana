/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { checkParam } from '../error_missing_required';
import { metrics } from '../metrics';
import { createQuery } from '../create_query.js';
import { formatTimestampToDuration } from '../../../common';
import { NORMALIZED_DERIVATIVE_UNIT, CALCULATE_DURATION_UNTIL } from '../../../common/constants';
import { formatUTCTimestampForTimezone } from '../format_timezone';

/**
 * Derivative metrics for the first two agg buckets are unusable. For the first bucket, there
 * simply is no derivative metric (as calculating a derivative requires two adjacent buckets). For
 * the second bucket the derivative value can be artificially high if the first bucket was a partial
 * bucket (can happen with date_histogram buckets). Such a high value shows up as a spike in charts.
 * For such cases, to have accurate derivative values, it becomes necessary to discard the first two
 * buckets. Rather than discarding the _actual_ first two buckets, this function offsets the `min`
 * timestamp value (i.e. the lower bound of the timepicker range) into the past by two buckets. That
 * way, we can later discard these two buckets without affecting the actual buckets.
 *
 * @param {int} minInMsSinceEpoch Lower bound of timepicker range, in ms-since-epoch
 * @param {int} bucketSizeInSeconds Size of a single date_histogram bucket, in seconds
 */
function offsetMinForDerivativeMetric(minInMsSinceEpoch, bucketSizeInSeconds) {
  return minInMsSinceEpoch - 2 * bucketSizeInSeconds * 1000;
}

// Use the metric object as the source of truth on where to find the UUID
function getUuid(req, metric) {
  if (metric.app === 'kibana') {
    return req.params.kibanaUuid;
  } else if (metric.app === 'logstash') {
    return req.params.logstashUuid;
  } else if (metric.app === 'elasticsearch') {
    return req.params.nodeUuid;
  }
}

function defaultCalculation(bucket, key) {
  const value = get(bucket, key, null);
  // negatives suggest derivatives that have been reset (usually due to restarts that reset the count)
  if (value < 0) {
    return null;
  }

  return value;
}

function createMetricAggs(metric) {
  if (metric.derivative) {
    return {
      metric_deriv: {
        derivative: {
          buckets_path: 'metric',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      ...metric.aggs,
    };
  }

  return metric.aggs;
}

function fetchSeries(
  req,
  indexPattern,
  metric,
  metricOptions,
  groupBy,
  min,
  max,
  bucketSize,
  filters
) {
  // if we're using a derivative metric, offset the min (also @see comment on offsetMinForDerivativeMetric function)
  const adjustedMin = metric.derivative ? offsetMinForDerivativeMetric(min, bucketSize) : min;

  let dateHistogramSubAggs = null;
  if (metric.getDateHistogramSubAggs) {
    dateHistogramSubAggs = metric.getDateHistogramSubAggs(metricOptions);
  } else if (metric.dateHistogramSubAggs) {
    dateHistogramSubAggs = metric.dateHistogramSubAggs;
  } else {
    dateHistogramSubAggs = {
      metric: {
        [metric.metricAgg]: {
          field: metric.field,
        },
      },
      ...createMetricAggs(metric),
    };
  }

  let aggs = {
    check: {
      date_histogram: {
        field: metric.timestampField,
        fixed_interval: bucketSize + 's',
      },
      aggs: {
        ...dateHistogramSubAggs,
      },
    },
  };

  if (groupBy) {
    aggs = {
      groupBy: {
        terms: groupBy,
        aggs,
      },
    };
  }

  const params = {
    index: indexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      query: createQuery({
        start: adjustedMin,
        end: max,
        metric,
        clusterUuid: req.params.clusterUuid,
        // TODO: Pass in the UUID as an explicit function parameter
        uuid: getUuid(req, metric),
        filters,
      }),
      aggs,
    },
  };

  if (metric.debug) {
    console.log('metric.debug', JSON.stringify(params));
  }

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params);
}

/**
 * Find the first usable index in the {@code buckets} that should be used based on the {@code min} timeframe.
 *
 * @param {Array} buckets The buckets keyed by the timestamp.
 * @param {String} min Max timestamp for results to exist within.
 * @return {Number} Index position to use for the first bucket. {@code buckets.length} if none should be used.
 */
function findFirstUsableBucketIndex(buckets, min) {
  const minInMillis = moment.utc(min).valueOf();

  for (let i = 0; i < buckets.length; ++i) {
    const bucketTime = get(buckets, [i, 'key']);
    const bucketTimeInMillis = moment.utc(bucketTime).valueOf();

    // if the bucket start time, without knowing the bucket size, is before the filter time, then it's inherently a partial bucket
    if (bucketTimeInMillis >= minInMillis) {
      return i;
    }
  }

  return buckets.length;
}

/**
 * Find the last usable index in the {@code buckets} that should be used based on the {@code max} timeframe.
 *
 * Setting the bucket size to anything above 0 means that partial buckets will be EXCLUDED because the bucket's
 * start time is considered with the bucket's size.
 *
 * @param {Array} buckets The buckets keyed by the timestamp.
 * @param {String} max Max timestamp for results to exist within.
 * @param {Number} firstUsableBucketIndex The index of the first used bucket (so we can stop looking after it is found).
 * @param {Number} bucketSizeInMillis Size of a bucket in milliseconds. Set to 0 to allow partial trailing buckets.
 * @return {Number} Index position to use for the last bucket. {@code -1} if none should be used.
 */
function findLastUsableBucketIndex(buckets, max, firstUsableBucketIndex, bucketSizeInMillis = 0) {
  const maxInMillis = moment.utc(max).valueOf();

  for (let i = buckets.length - 1; i > firstUsableBucketIndex - 1; --i) {
    const bucketTime = get(buckets, [i, 'key']);
    const bucketTimeInMillis = moment.utc(bucketTime).valueOf() + bucketSizeInMillis;

    if (bucketTimeInMillis <= maxInMillis) {
      return i;
    }
  }

  // note: the -1 forces any comparisons with this value and the first index to fail
  return -1;
}

const formatBucketSize = bucketSizeInSeconds => {
  const now = moment();
  const timestamp = moment(now).add(bucketSizeInSeconds, 'seconds'); // clone the `now` object

  return formatTimestampToDuration(timestamp, CALCULATE_DURATION_UNTIL, now);
};

function isObject(value) {
  return typeof value === 'object' && !!value && !Array.isArray(value);
}

function countBuckets(data, count = 0) {
  if (data.buckets) {
    count += data.buckets.length;
    for (const bucket of data.buckets) {
      for (const key of Object.keys(bucket)) {
        if (isObject(bucket[key])) {
          count = countBuckets(bucket[key], count);
        }
      }
    }
  } else {
    for (const key of Object.keys(data)) {
      if (isObject(data[key])) {
        count = countBuckets(data[key], count);
      }
    }
  }
  return count;
}

function handleSeries(metric, groupBy, min, max, bucketSizeInSeconds, timezone, response) {
  const { derivative, calculation: customCalculation } = metric;

  function getAggregatedData(buckets) {
    const firstUsableBucketIndex = findFirstUsableBucketIndex(buckets, min);
    const lastUsableBucketIndex = findLastUsableBucketIndex(
      buckets,
      max,
      firstUsableBucketIndex,
      bucketSizeInSeconds * 1000
    );
    let data = [];

    if (metric.debug) {
      console.log(
        `metric.debug field=${metric.field} bucketsCreated: ${countBuckets(
          get(response, 'aggregations.check')
        )}`
      );
      console.log(`metric.debug`, {
        bucketsLength: buckets.length,
        firstUsableBucketIndex,
        lastUsableBucketIndex,
      });
    }

    if (firstUsableBucketIndex <= lastUsableBucketIndex) {
      // map buckets to values for charts
      const key = derivative ? 'metric_deriv.normalized_value' : 'metric.value';
      const calculation = customCalculation !== undefined ? customCalculation : defaultCalculation;

      data = buckets
        .slice(firstUsableBucketIndex, lastUsableBucketIndex + 1) // take only the buckets we know are usable
        .map(bucket => [
          formatUTCTimestampForTimezone(bucket.key, timezone),
          calculation(bucket, key, metric, bucketSizeInSeconds),
        ]); // map buckets to X/Y coords for Flot charting
    }

    return {
      bucket_size: formatBucketSize(bucketSizeInSeconds),
      timeRange: {
        min: formatUTCTimestampForTimezone(min, timezone),
        max: formatUTCTimestampForTimezone(max, timezone),
      },
      metric: metric.serialize(),
      data,
    };
  }

  if (groupBy) {
    return get(response, 'aggregations.groupBy.buckets', []).map(bucket => {
      return {
        groupedBy: bucket.key,
        ...getAggregatedData(get(bucket, 'check.buckets', [])),
      };
    });
  }

  return getAggregatedData(get(response, 'aggregations.check.buckets', []));
}

/**
 * Calculate the series (aka, time-plotted) values for a single metric.
 *
 * TODO: This should be expanded to accept multiple metrics in a single request to allow a single date histogram to be used.
 *
 * @param {Object} req The incoming user's request.
 * @param {String} indexPattern The relevant index pattern (not just for Elasticsearch!).
 * @param {String} metricName The name of the metric being plotted.
 * @param {Array} filters Any filters that should be applied to the query.
 * @return {Promise} The object response containing the {@code timeRange}, {@code metric}, and {@code data}.
 */
export async function getSeries(
  req,
  indexPattern,
  metricName,
  metricOptions,
  filters,
  groupBy,
  { min, max, bucketSize, timezone }
) {
  checkParam(indexPattern, 'indexPattern in details/getSeries');

  const metric = metrics[metricName];
  if (!metric) {
    throw new Error(`Not a valid metric: ${metricName}`);
  }
  const response = await fetchSeries(
    req,
    indexPattern,
    metric,
    metricOptions,
    groupBy,
    min,
    max,
    bucketSize,
    filters
  );

  return handleSeries(metric, groupBy, min, max, bucketSize, timezone, response);
}
