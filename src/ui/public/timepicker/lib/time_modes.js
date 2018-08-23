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

import _ from 'lodash';
import dateMath from '@kbn/datemath';
import { parseRelativeString } from '../parse_relative_parts';

const ISO8601_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS';

export const TIME_MODES = {
  ABSOLUTE: 'absolute',
  RELATIVE: 'relative',
  NOW: 'now',
};

export function getTimeMode(value) {
  if (value === 'now') {
    return TIME_MODES.NOW;
  }

  if (value.includes('now')) {
    return TIME_MODES.RELATIVE;
  }

  return TIME_MODES.absolute;
}

export function toAbsoluteString(value, roundUp) {
  return dateMath.parse(value, { roundUp }).toISOString();
}

export function toRelativeString(value) {
  const relativeParts = parseRelativeString(value);
  const count = _.get(relativeParts, `count`, 0);
  const round = _.get(relativeParts, `round`, false);
  const matches = _.get(relativeParts, `unit`, 's').match(/([smhdwMy])(\+)?/);
  let unit;
  let operator = '-';
  if (matches && matches[1]) unit = matches[1];
  if (matches && matches[2]) operator = matches[2];
  if (count === 0 && !round) return 'now';
  let result = `now${operator}${count}${unit}`;
  result += (round ? '/' + unit : '');
  return result;
}
