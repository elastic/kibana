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
import { isFunction } from 'lodash';
import { FieldParamType } from '../../../agg_types/param_types';
import { aggTypeFieldFilters } from '../../../agg_types/param_types/filter';
import { IndexPattern } from '../../../index_patterns';
import { AggConfig } from '../../../vis';

import { propFilter } from '../../../filters/_prop_filter';

const filterByType = propFilter('type');

/**
 * This filter uses the {@link FieldParamType|fieldParamType} information
 * and limits available fields based on that.
 */
aggTypeFieldFilters.addFilter(
  (
    field: any,
    fieldParamType: FieldParamType,
    indexPattern: IndexPattern,
    aggConfig: AggConfig
  ) => {
    const { onlyAggregatable, scriptable, filterFieldTypes } = fieldParamType;

    const filters = isFunction(filterFieldTypes)
      ? filterFieldTypes.bind(fieldParamType, aggConfig.vis)
      : filterFieldTypes;

    if ((onlyAggregatable && !field.aggregatable) || (!scriptable && field.scripted)) {
      return false;
    }

    if (!filters) {
      return true;
    }

    return filterByType([field], filters).length !== 0;
  }
);
