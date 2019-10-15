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

import { TSearchStrategyProvider } from 'src/plugins/data/server';
import { exec } from 'child_process';
import uuid from 'uuid';
import { string } from 'joi';
import { SQL_SEARCH_STRATEGY } from '../common';

export const sqlSearchStrategyProvider: TSearchStrategyProvider<typeof SQL_SEARCH_STRATEGY> = (
  context,
  caller
) => {
  return {
    search: async request => {
      console.log('in sqlSearchStrategyProvider.search with ', JSON.stringify(request));
      try {
        const results = await caller('transport.request', {
          path: '/_sql?format=json',
          method: 'POST',
          body: {
            query: request.sql,
            client_id: 'sqlsearchstrategy',
          },
        });

        console.log('results is ', JSON.stringify(results));

        const tmpIndexName = `sql-tmp-${uuid.v4()}`;
        await caller('indices.create', { index: tmpIndexName });

        // const columnsMapping = res.columns.map(({ name, type }) => {
        //   return { name: sanitizeName(name), type: normalizeType(type) };
        // });
        // const columnNames = map(columns, 'name');
        // const rows = res.rows.map(row => zipObject(columnNames, row));
        // return {
        //   type: 'datatable',
        //   columns,
        //   rows,
        // };

        const mapping: { [key: string]: { type: string } } = {};
        results.columns.forEach((column: { name: string; type: string }) => {
          mapping[column.name] = { type: column.type };
        });
        console.log('putting mapping ', JSON.stringify(mapping));
        await caller('indices.putMapping', { index: tmpIndexName, body: mapping });

        await Promise.all(
          results.rows.map(async (row: any[]) => {
            if (row) {
              const doc = {};
              row.forEach((cell, i) => {
                doc[results.columns[i]] = cell;
              });
              console.log('indexing doc', doc);
              await caller('index', doc);
            }
          })
        );

        return { index: tmpIndexName };
      } catch (e) {
        console.error(e);
        return {};
      }
    },
  };
};
