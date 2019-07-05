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
import moment from 'moment';
import { buildRangeFilter } from '@kbn/es-query';
import { timefilter } from 'ui/timefilter';

export function onBrushEvent(event, $state) {
  if (!event.data.xAxisField) {
    return;
  }

  const isDate = event.data.xAxisField.type === 'date';
  const isNumber = event.data.xAxisField.type === 'number';

  if (isDate &&
    event.data.xAxisField.name === event.data.indexPattern.timeFieldName) {
    setTimefilter();
  } else if (isDate || isNumber) {
    setRange();
  }

  function setTimefilter() {
    const from = moment(event.range[0]);
    const to = moment(event.range[1]);

    if (to - from === 0) return;

    timefilter.setTime({
      from,
      to,
      mode: 'absolute'
    });
  }

  function setRange() {
    if (event.range.length <= 1) return;

    const existingFilter = $state.filters.find(filter => (
      filter.meta && filter.meta.key === event.data.xAxisField.name
    ));

    const min = event.range[0];
    const max = event.range[event.range.length - 1];
    let range;
    if (isDate) {
      range = {
        gte: moment(min).valueOf(),
        lt: moment(max).valueOf(),
        format: 'epoch_millis'
      };
    } else {
      range = {
        gte: min,
        lt: max
      };
    }

    if (_.has(existingFilter, 'range')) {
      existingFilter.range[event.data.xAxisField.name] = range;
    } else if (_.has(existingFilter, 'script.script.params.gte')
      && _.has(existingFilter, 'script.script.params.lt')) {
      existingFilter.script.script.params.gte = min;
      existingFilter.script.script.params.lt = max;
    } else {
      const newFilter = buildRangeFilter(
        event.data.xAxisField,
        range,
        event.data.indexPattern,
        event.data.xAxisFormatter);
      $state.$newFilters = [newFilter];
    }
  }
}
