/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import dateMath from '@kbn/datemath';
import { leastCommonMultiple } from '../../utils/math';
import { parseEsInterval } from '../../utils/parse_es_interval';

/**
 * Finds the lowest common interval between two given ES date histogram intervals
 * in the format of (value)(unit)
 *
 *  - `ms` units are fixed-length intervals
 *  - `s, m, h, d` units are fixed-length intervals when value > 1 (i.e. 2m, 24h, 7d),
 *    but calendar interval when value === 1
 *  - `w, M, q, y` units are calendar intervals and do not support multiple, aka
 *    value must === 1
 *
 * @returns {string}
 */
export function leastCommonInterval(a: string, b: string): string {
  const { unitsMap, unitsDesc } = dateMath;
  const aInt = parseEsInterval(a);
  const bInt = parseEsInterval(b);

  if (a === b) {
    return a;
  }

  const aUnit = unitsMap[aInt.unit];
  const bUnit = unitsMap[bInt.unit];

  // If intervals aren't the same type, throw error
  if (aInt.type !== bInt.type) {
    throw Error(`Incompatible intervals: ${a} (${aInt.type}), ${b} (${bInt.type})`);
  }

  // If intervals are calendar units, pick the larger one (calendar value is always 1)
  if (aInt.type === 'calendar' || bInt.type === 'calendar') {
    return aUnit.weight > bUnit.weight ? `${aInt.value}${aInt.unit}` : `${bInt.value}${bInt.unit}`;
  }

  // Otherwise if intervals are fixed units, find least common multiple in milliseconds
  const aMs = aInt.value * aUnit.base;
  const bMs = bInt.value * bUnit.base;
  const lcmMs = leastCommonMultiple(aMs, bMs);

  // Return original interval string if it matches one of the original milliseconds
  if (lcmMs === bMs) {
    return b.replace(/\s/g, '');
  }
  if (lcmMs === aMs) {
    return a.replace(/\s/g, '');
  }

  // Otherwise find the biggest non-calendar unit that divides evenly
  const lcmUnit = unitsDesc.find(unit => {
    const unitInfo = unitsMap[unit];
    return !!(unitInfo.type !== 'calendar' && lcmMs % unitInfo.base === 0);
  });

  // Throw error in case we couldn't divide evenly, theoretically we never get here as everything is
  // divisible by 1 millisecond
  if (!lcmUnit) {
    throw Error(`Unable to find common interval for: ${a}, ${b}`);
  }

  // Return the interval string
  return `${lcmMs / unitsMap[lcmUnit].base}${lcmUnit}`;
}
