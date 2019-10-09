/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMESBucket, UMESHistogramBucket } from '../adapters/database';

/**
 * The charting library we're currently using requires histogram data points have an
 * x and an x0 property, where x0 is the beginning of a data point and x provides
 * the size of the point from the start. This function attempts to generalize the
 * concept so any bucket that has a numeric value as its key can be put into this format.
 *
 * Additionally, histograms that stack horizontally instead of vertically need to have
 * a y and a y0 value. We're not doing this currently but with some minor modification
 * this function could provide formatting for those buckets as well.
 * @param buckets The ES data to format.
 */
export function formatEsBucketsForHistogram<T extends UMESBucket>(
  buckets: T[]
): Array<T & UMESHistogramBucket> {
  if (buckets.length < 1) {
    return [];
  }
  console.log("BUCKETS", buckets);
  const { key: terminalBucketTime } = buckets[buckets.length -1];
  return buckets.map((item, index, array) => {
    const { key } = item;
    const nextItem = array[index + 1];
    console.log("ITEM", item);
    console.log("IDX", index);
    const bucketSize = nextItem ? Math.abs(nextItem.key - key) : Math.abs(terminalBucketTime - key - 1000);

    return {
      x: key + bucketSize,
      x0: key,
      ...item,
    };
  });
}
