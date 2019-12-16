/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export function mapResponseTimes(times) {
  const responseTimes = _.reduce(
    _.values(times),
    (result, value) => {
      if (value.avg) {
        result.avg = Math.max(result.avg, value.avg);
      }
      result.max = Math.max(result.max, value.max);
      return result;
    },
    { avg: 0, max: 0 }
  );
  return {
    average: responseTimes.avg,
    max: responseTimes.max,
  };
}
