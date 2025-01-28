/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

interface Bucket {
  key: string;
}

/* calling .subtract or .add on a moment object mutates the object
 * so this function shortcuts creating a fresh object */
function getTime(bucket: Bucket) {
  return moment.utc(bucket.key);
}

/* find the milliseconds of difference between 2 moment objects */
function getDelta(t1: number, t2: number) {
  return moment.duration(t1 - t2).asMilliseconds();
}

export function filterPartialBuckets(
  min: number,
  max: number,
  bucketSize: number,
  options: { ignoreEarly?: boolean } = {}
) {
  return (bucket: Bucket) => {
    const bucketTime = getTime(bucket);
    // timestamp is too late to be complete
    if (getDelta(max, bucketTime.add(bucketSize, 'seconds').valueOf()) < 0) {
      return false;
    }

    /* Table listing metrics don't need to filter the beginning of data for
     * partial buckets. They just boil down the data into max/min/last/slope
     * numbers instead of graphing it. So table listing data buckets pass
     * ignoreEarly */
    if (options.ignoreEarly !== true) {
      // timestamp is too early to be complete
      if (getDelta(bucketTime.subtract(bucketSize, 'seconds').valueOf(), min) < 0) {
        return false;
      }
    }

    return true;
  };
}
