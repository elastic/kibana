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
import { AggType } from '../../../agg_types';
import { FieldParamType } from '../../../agg_types/param_types';
import { aggTypeFieldFilters } from '../../../agg_types/param_types/filter';
import { IndexPattern } from '../../../index_patterns';
import { AggConfig } from '../../../vis';

import { propFilter } from '../../../filters/_prop_filter';

const filterByType = propFilter('type');

/**
 * This filter checks the defined aggFilter in the schemas of that visualization
 * and limits available aggregations based on that.
 */
aggTypeFieldFilters.addFilter(
  (
    field: any,
    aggType: AggType,
    fieldParamType: FieldParamType,
    indexPattern: IndexPattern,
    aggConfig: AggConfig
  ) => {
    if (
      (fieldParamType.onlyAggregatable && !field.aggregatable) ||
      (!fieldParamType.scriptable && field.scripted)
    ) {
      return false;
    }

    if (fieldParamType.filterFieldTypes) {
      let filters = fieldParamType.filterFieldTypes;
      if (_.isFunction(fieldParamType.filterFieldTypes)) {
        filters = fieldParamType.filterFieldTypes.bind(this, aggConfig.vis);
      }
      return filterByType([field], filters).length !== 0;
    }

    return true;
  }
);
