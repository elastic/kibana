/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const units = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7, // Hum... might be wrong
  M: 86400 * 30, // this too... 29,30,31?
  y: 86400 * 356 // Leap year?
};

export function unitToSeconds(unit) {
  return units[unit];
}
