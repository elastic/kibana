/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { random } from 'lodash';

import { Point, TransitionMethod } from '../../types';
import { createExponentialFunction } from './create_exponetial_function';
import { createLinearFunction } from './create_linear_function';
import { createSineFunction } from './create_sine_function';

export { createSineFunction } from './create_sine_function';
export { createLinearFunction } from './create_linear_function';
export { createExponentialFunction } from './create_exponetial_function';

function randomnessWrapper(
  randomness: number,
  fn: (timestamp: Moment) => number
): (timestamp: Moment) => number {
  return (timestamp: Moment) => {
    const value = fn(timestamp);
    if (randomness === 0) {
      return value;
    }
    const offset = value * randomness;
    return random(value - offset, value + offset);
  };
}

export function createDataShapeFunction(
  method: TransitionMethod,
  startPoint: Point,
  endPoint: Point,
  randomness = 0,
  period = 60
) {
  if (method === 'linear') {
    return randomnessWrapper(randomness, createLinearFunction(startPoint, endPoint));
  }
  if (method === 'exp') {
    return randomnessWrapper(randomness, createExponentialFunction(startPoint, endPoint));
  }
  if (method === 'sine') {
    if (!period) {
      throw new Error('Sine transition method requires period.');
    }
    return randomnessWrapper(randomness, createSineFunction(startPoint, endPoint, period));
  }
  throw new Error(`Unknown transition method: ${method}`);
}
