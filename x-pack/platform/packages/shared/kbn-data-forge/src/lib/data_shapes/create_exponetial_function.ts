/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { Point } from '../../types';

export function createExponentialFunction(start: Point, end: Point) {
  const totalPoints = end.x - start.x;
  const ratio = end.y / start.y;
  const exponent = Math.log(ratio) / (totalPoints - 1);
  return (timestamp: Moment) => {
    const x = timestamp.valueOf() - start.x;
    return start.y * Math.exp(exponent * x);
  };
}
