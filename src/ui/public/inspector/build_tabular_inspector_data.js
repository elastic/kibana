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

import { set } from 'lodash';
import { createFilter } from '../vis/vis_filters';
import { FormattedData } from './adapters/data';

/**
 * This function builds tabular data from the response and attaches it to the
 * inspector. It will only be called when the data view in the inspector is opened.
 */
export async function buildTabularInspectorData(table, queryFilter) {
  const rows = table.rows.map(row => {
    return table.columns.reduce((prev, cur, colIndex) => {
      const value = row[cur.id];
      const fieldFormatter = cur.aggConfig.fieldFormatter('text');
      prev[`col-${colIndex}-${cur.aggConfig.id}`] = new FormattedData(value, fieldFormatter(value));
      return prev;
    }, {});
  });

  const columns = table.columns.map((col, colIndex) => {
    const field = col.aggConfig.getField();
    const isCellContentFilterable =
      col.aggConfig.isFilterable()
      && (!field || field.filterable);
    return ({
      name: col.name,
      field: `col-${colIndex}-${col.aggConfig.id}`,
      filter: isCellContentFilterable && (value => {
        const rowIndex = rows.findIndex(row => row[`col-${colIndex}-${col.aggConfig.id}`].raw === value.raw);
        const filter = createFilter(table, colIndex, rowIndex, value.raw);
        queryFilter.addFilters(filter);
      }),
      filterOut: isCellContentFilterable && (value => {
        const rowIndex = rows.findIndex(row => row[`col-${colIndex}-${col.aggConfig.id}`].raw === value.raw);
        const filter = createFilter(table, colIndex, rowIndex, value.raw);
        const notOther = value.raw !== '__other__';
        const notMissing = value.raw !== '__missing__';
        if (Array.isArray(filter)) {
          filter.forEach(f => set(f, 'meta.negate', (notOther && notMissing)));
        } else {
          set(filter, 'meta.negate', (notOther && notMissing));
        }
        queryFilter.addFilters(filter);
      }),
    });
  });

  return { columns, rows };
}
