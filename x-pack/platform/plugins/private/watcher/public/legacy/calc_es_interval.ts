/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

import { parseEsInterval } from './parse_es_interval';

const unitsDesc = dateMath.unitsDesc;
const largeMax = unitsDesc.indexOf('M');

/**
 * Convert a moment.duration into an es
 * compatible expression, and provide
 * associated metadata
 *
 * @param duration
 */
export function convertDurationToNormalizedEsInterval(duration: moment.Duration) {
  for (let i = 0; i < unitsDesc.length; i++) {
    const unit = unitsDesc[i];
    const val = duration.as(unit);
    // find a unit that rounds neatly
    if (val >= 1 && Math.floor(val) === val) {
      // if the unit is "large", like years, but
      // isn't set to 1 ES will puke. So keep going until
      // we get out of the "large" units
      if (i <= largeMax && val !== 1) {
        continue;
      }

      return {
        value: val,
        unit,
        expression: val + unit,
      };
    }
  }

  const ms = duration.as('ms');
  return {
    value: ms,
    unit: 'ms',
    expression: ms + 'ms',
  };
}

export function convertIntervalToEsInterval(interval: string) {
  const { value, unit } = parseEsInterval(interval);
  return {
    value,
    unit,
    expression: interval,
  };
}
