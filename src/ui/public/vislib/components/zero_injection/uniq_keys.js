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
import { VislibComponentsZeroInjectionFlattenDataProvider } from './flatten_data';

export function VislibComponentsZeroInjectionUniqKeysProvider(Private) {

  const flattenDataArray = Private(VislibComponentsZeroInjectionFlattenDataProvider);

  /*
   * Accepts a Kibana data object.
   * Returns an object with unique x axis values as keys with an object of
   * their index numbers and an isNumber boolean as their values.
   * e.g. { 'xAxisValue': { index: 1, isNumber: false }}, ...
   */

  return function (obj) {
    if (!_.isObject(obj)) {
      throw new TypeError('UniqueXValuesUtilService expects an object');
    }

    const flattenedData = flattenDataArray(obj);
    const uniqueXValues = new Map();

    let charts;
    if (!obj.series) {
      charts = obj.rows ? obj.rows : obj.columns;
    } else {
      charts = [obj];
    }

    const isDate = charts.every(function (chart) {
      return chart.ordered && chart.ordered.date;
    });

    const isOrdered = charts.every(function (chart) {
      return chart.ordered;
    });

    flattenedData.forEach(function (d, i) {
      const key = d.x;
      const prev = uniqueXValues.get(key);
      let sum = d.y;

      if (prev) {
        i = Math.min(i, prev.index);
        sum += prev.sum;
      }

      uniqueXValues.set(key, {
        index: i,
        isDate: isDate,
        isOrdered: isOrdered,
        isNumber: _.isNumber(key),
        sum: sum
      });
    });

    return uniqueXValues;
  };
}
