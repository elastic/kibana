/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { Point } from '../../types';

function caluclateOffset(amplitude: number, y1: number) {
  const offset = y1 - amplitude;
  return offset > 0 ? 0 : Math.abs(offset);
}

export function createSineFunction(start: Point, end: Point, period = 60) {
  const midline = start.y;
  const amplitude = (end.y - start.y) / 2;
  const offset = caluclateOffset(amplitude, start.y);
  return (timestamp: Moment) => {
    const x = (timestamp.valueOf() - start.x) / 1000;
    const y = midline + amplitude * Math.sin(((2 * Math.PI) / period) * x) + offset;
    return y;
  };
}
