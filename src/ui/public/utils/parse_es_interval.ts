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

const ES_INTERVAL_STRING_REGEX = new RegExp(
  '^([1-9][0-9]*)\\s*(' + dateMath.units.join('|') + ')$'
);

/**
 * Extracts interval properties from an ES interval string. Disallows unrecognized interval formats
 * and fractional values. Converts some intervals from "calendar" to "fixed" when the number of
 * units is larger than 1, and throws an error for others.
 *
 * Conversion rules:
 *
 * | Interval | Single unit type | Multiple units type |
 * | -------- | ---------------- | ------------------- |
 * | ms       | fixed            | fixed               |
 * | s        | fixed            | fixed               |
 * | m        | fixed            | fixed               |
 * | h        | calendar         | fixed               |
 * | d        | calendar         | fixed               |
 * | w        | calendar         | N/A - disallowed    |
 * | M        | calendar         | N/A - disallowed    |
 * | y        | calendar         | N/A - disallowed    |
 *
 */
export function parseEsInterval(interval: string): { value: number; unit: string; type: string } {
  const matches = String(interval)
    .trim()
    .match(ES_INTERVAL_STRING_REGEX);

  if (!matches) {
    throw Error(`Invalid interval format: ${interval}`);
  }

  const value = matches && parseFloat(matches[1]);
  const unit = matches && matches[2];
  const type = unit && dateMath.unitsMap[unit].type;

  if (type === 'calendar' && value !== 1) {
    throw Error(`Invalid calendar interval: ${interval}, value must be 1`);
  }

  return {
    value,
    unit,
    type: (type === 'mixed' && value === 1) || type === 'calendar' ? 'calendar' : 'fixed',
  };
}
