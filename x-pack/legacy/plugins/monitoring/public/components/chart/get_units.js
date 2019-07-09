/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, forEach, last } from 'lodash';
import numeral from '@elastic/numeral';

export function getUnits(series) {
  let units = get(series, '[0].metric.units');

  // For Bytes, find the largest unit from any data set's _last_ item
  if (units === 'B') {
    let maxLastBytes = 0;
    forEach(series, (s) => {
      const lastDataPoint = last(s.data) || [null, 0];
      maxLastBytes = Math.max(maxLastBytes, lastDataPoint[1]); // lastDataPoint[1] is the "y" value
    });

    units = numeral(maxLastBytes).byteUnits();
  }

  return units;
}
