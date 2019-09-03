/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const intervalUnits = ['y', 'M', 'w', 'd', 'h', 'm', 's', 'ms'];
const INTERVAL_STRING_RE = new RegExp('^([0-9\\.]*)\\s*(' + intervalUnits.join('|') + ')$');

interface UnitsToSeconds {
  [unit: string]: number;
}

const units: UnitsToSeconds = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7,
  M: 86400 * 30,
  y: 86400 * 356,
};

export const getIntervalInSeconds = (interval: string): number => {
  const matches = interval.match(INTERVAL_STRING_RE);
  if (matches) {
    return parseFloat(matches[1]) * units[matches[2]];
  }
  throw new Error('Invalid interval string format.');
};
