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
import { VislibComponentsLabelsFlattenSeriesProvider } from './flatten_series';

export function VislibComponentsLabelsDataArrayProvider(Private) {
  const flattenSeries = Private(VislibComponentsLabelsFlattenSeriesProvider);

  /*
   * Accepts a Kibana data object and returns an array of values objects.
  */
  return function (obj) {
    if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
      throw new TypeError('GetArrayUtilService expects an object with a series, rows, or columns key');
    }

    if (!obj.series) return flattenSeries(obj);
    return obj.series;
  };
}
