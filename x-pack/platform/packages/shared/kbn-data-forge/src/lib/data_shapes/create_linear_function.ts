/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { Point } from '../../types';

export function createLinearFunction(start: Point, end: Point) {
  const slope = (end.y - start.y) / (end.x - start.x);
  const intercept = start.y - slope * start.x;
  return (timestamp: Moment | number) => {
    return slope * timestamp.valueOf() + intercept;
  };
}
