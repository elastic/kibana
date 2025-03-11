/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { calculateAuto } from './calculate_auto';

export function calculateTimeseriesInterval(
  lowerBoundInMsSinceEpoch: number,
  upperBoundInMsSinceEpoch: number,
  minIntervalSeconds: number
) {
  const duration = moment.duration(upperBoundInMsSinceEpoch - lowerBoundInMsSinceEpoch, 'ms');

  return Math.max(
    !isNaN(minIntervalSeconds) ? minIntervalSeconds : 0,
    calculateAuto(100, duration).asSeconds()
  );
}
