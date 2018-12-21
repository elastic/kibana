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

import dateMath from '@elastic/datemath';
import moment from 'moment';
import _ from 'lodash';
import { relativeOptions } from './relative_options';

export function parseRelativeString(part) {
  let results = {};
  const matches = _.isString(part) && part.match(/now(([\-\+])([0-9]+)([smhdwMy])(\/[smhdwMy])?)?/);

  const isNow = matches && !matches[1];
  const operator = matches && matches[2];
  const count = matches && matches[3];
  const unit = matches && matches[4];
  const roundBy = matches && matches[5];

  if (isNow) {
    return { count: 0, unit: 's', round: false };
  }

  if (count && unit) {
    results.count = parseInt(count, 10);
    results.unit = unit;
    if (operator === '+') results.unit += '+';
    results.round = roundBy ? true : false;
    return results;

  } else {
    results = { count: 0, unit: 's', round: false };
    const duration = moment.duration(moment().diff(dateMath.parse(part)));
    const units = _.pluck(_.clone(relativeOptions).reverse(), 'value')
      .filter(s => /^[smhdwMy]$/.test(s));
    let unitOp = '';
    for (let i = 0; i < units.length; i++) {
      const as = duration.as(units[i]);
      if (as < 0) unitOp = '+';
      if (Math.abs(as) > 1) {
        results.count = Math.round(Math.abs(as));
        results.unit = units[i] + unitOp;
        results.round = false;
        break;
      }
    }
    return results;
  }


}

export function parseRelativeParts(from, to) {
  const results = {};
  results.from = parseRelativeString(from);
  results.to = parseRelativeString(to);
  if (results.from && results.to) return results;
}
