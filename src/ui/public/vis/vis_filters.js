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
import { FilterBarPushFiltersProvider } from '../filter_bar/push_filters';
import { FilterBarQueryFilterProvider } from '../filter_bar/query_filter';
import { onBrushEvent } from '../utils/brush_event';

/**
 * For terms aggregations on `__other__` buckets, this assembles a list of applicable filter
 * terms based on a specific cell in the tabified data.
 *
 * @param  {object} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @return {array} - array of terms to filter against
 */
const getOtherBucketFilterTerms = (table, columnIndex, rowIndex) => {
  if (rowIndex === -1) {
    return [];
  }

  // get only rows where cell value matches current row for all the fields before columnIndex
  const rows = table.rows.filter(row => {
    return table.columns.every((column, i) => {
      return row[column.id] === table.rows[rowIndex][column.id] || i >= columnIndex;
    });
  });
  const terms = rows.map(row => row[table.columns[columnIndex].id]);

  return [...new Set(terms.filter(term => {
    const notOther = term !== '__other__';
    const notMissing = term !== '__missing__';
    return notOther && notMissing;
  }))];
};

/**
 * Assembles the filters needed to apply filtering against a specific cell value, while accounting
 * for cases like if the value is a terms agg in an `__other__` or `__missing__` bucket.
 *
 * @param  {object} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @param  {string} cellValue - value of the current cell
 * @return {array|string} - filter or list of filters to provide to queryFilter.addFilters()
 */
const createFilter = (table, columnIndex, rowIndex, cellValue) => {
  const { aggConfig, id: columnId } = table.columns[columnIndex];
  let filter = [];
  const value = rowIndex > -1 ? table.rows[rowIndex][columnId] : cellValue;
  if (value === null || value === undefined || !aggConfig.isFilterable()) {
    return;
  }
  if (aggConfig.type.name === 'terms' && aggConfig.params.otherBucket) {
    const terms = getOtherBucketFilterTerms(table, columnIndex, rowIndex);
    filter = aggConfig.createFilter(value, { terms });
  } else {
    filter = aggConfig.createFilter(value);
  }

  if (!Array.isArray(filter)) {
    filter = [filter];
  }

  return filter;
};

const VisFiltersProvider = (Private, getAppState) => {
  const filterBarPushFilters = Private(FilterBarPushFiltersProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);

  const pushFilters = (filters, simulate) => {
    const appState = getAppState();
    if (filters.length && !simulate) {
      const flatFilters = _.flatten(filters);
      filterBarPushFilters(appState)(flatFilters.filter((v, i) => i === flatFilters.findIndex(f => _.isEqual(v, f))));
    }
  };

  const filter = (event, { simulate = false } = {}) => {
    const data = event.datum;
    const filters = [];

    ['xRaw', 'yRaw', 'zRaw', 'seriesRaw', 'rawData', 'tableRaw'].forEach(val => {
      if (!data[val]) return;
      const { table, column, row, value } = data[val];
      const columnIndex = table.columns.findIndex(c => c.id === column);
      const filter = createFilter(table, columnIndex, row, value);
      if (filter) {
        if (event.negate) {
          filter.forEach(f => f.meta.negate = !f.meta.negate);
        }
        filter.forEach(f => filters.push(f));
      }
    });

    pushFilters(filters, simulate);
    return filters;
  };

  const pieFilter = event => {
    let data = event.datum;
    const filters = [];
    while (data && data.rawData) {
      const { table, column, row, value } = data.rawData;
      const filter = createFilter(table, column, row, value);
      if (event.negate) {
        filter.forEach(f => f.meta.negate = !f.meta.negate);
      }
      filter.forEach(f => filters.push(f));
      data = data.parent;
    }

    if (event.datum.rawData.table.$parent && event.data) {
      const { table, column, row, key } = event.datum.rawData.table.$parent;
      const filter = createFilter(table, column, row, key);
      if (event.negate) {
        filter.forEach(f => f.meta.negate = !f.meta.negate);
      }
      filter.forEach(f => filters.push(f));
    }

    pushFilters(filters, false);
    return filters;
  };

  const addFilter = (event) => {
    const filter = createFilter(event.table, event.column, event.row, event.value);
    queryFilter.addFilters(filter);
  };

  return {
    addFilter,
    filter,
    pieFilter,
    brush: (event) => {
      onBrushEvent(event, getAppState());
    },
  };
};

export { VisFiltersProvider, createFilter };
