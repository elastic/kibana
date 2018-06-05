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

export function calculateBounds(timeRange, options = {}) {
  return {
    min: dateMath.parse(timeRange.from, { forceNow: options.forceNow }),
    max: dateMath.parse(timeRange.to, { roundUp: true, forceNow: options.forceNow })
  };
}

export function getTime(indexPattern, timeRange, forceNow) {
  if (!indexPattern) {
    //in CI, we sometimes seem to fail here.
    return;
  }

  let filter;
  const timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, { name: indexPattern.timeFieldName });

  if (timefield) {
    const bounds = calculateBounds(timeRange, { forceNow });
    filter = { range: {} };
    filter.range[timefield.name] = {
      gte: bounds.min.valueOf(),
      lte: bounds.max.valueOf(),
      format: 'epoch_millis'
    };
  }

  return filter;
}
