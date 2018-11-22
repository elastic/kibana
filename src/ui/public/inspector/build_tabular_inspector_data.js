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

import { FormattedData } from './adapters/data';

/**
 * This function builds tabular data from the response and attaches it to the
 * inspector. It will only be called when the data view in the inspector is opened.
 */
export async function buildTabularInspectorData(table, queryFilter) {
  const columns = table.columns.map((col, index) => {
    const field = col.aggConfig.getField();
    const isCellContentFilterable =
      col.aggConfig.isFilterable()
      && (!field || field.filterable);
    return ({
      name: col.name,
      field: `col${index}`,
      filter: isCellContentFilterable && ((value) => {
        const filter = col.aggConfig.createFilter(value.raw);
        queryFilter.addFilters(filter);
      }),
      filterOut: isCellContentFilterable && ((value) => {
        const filter = col.aggConfig.createFilter(value.raw);
        filter.meta = filter.meta || {};
        filter.meta.negate = true;
        queryFilter.addFilters(filter);
      }),
    });
  });
  const rows = table.rows.map(row => {
    return table.columns.reduce((prev, cur, index) => {
      const value = row[cur.id];
      const fieldFormatter = cur.aggConfig.fieldFormatter('text');
      prev[`col${index}`] = new FormattedData(value, fieldFormatter(value));
      return prev;
    }, {});
  });

  return { columns, rows };
}
