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

import {
  KibanaContext,
  AnyExpressionFunction,
} from '../../../../../../src/plugins/expressions/common';
import { ISearchGeneric } from '../../../../../../src/plugins/data/public';
import { EQL_SEARCH_STRATEGY, IEqlSearchResponse } from '../../common';

export const createEsEqlFn = (search: ISearchGeneric): AnyExpressionFunction => ({
  name: 'esEql',
  type: 'datatable',
  context: {
    types: ['kibana_context', 'null'],
  },
  help: '',
  args: {
    eql: {
      types: ['string', 'null'],
      default: '"{}"',
      help: 'eql string',
    },
    indexPattern: {
      types: ['string', 'null'],
      default: '"endgame-*"',
      help: 'index pattern',
    },
  },
  async fn(context: KibanaContext, args: { indexPattern?: string; eql: string }) {
    console.log('Searching esEql with index pattern ', context.indexPattern || args.indexPattern);
    const response = ((await search(
      { eql: args.eql, indexPattern: context.indexPattern || args.indexPattern },
      {},
      EQL_SEARCH_STRATEGY
    ).toPromise()) as unknown) as IEqlSearchResponse;

    if (!response.index) {
      return {
        type: 'datatable',
        rows: [],
        columns: [],
      };
    }

    const results = await search({ params: { index: response.index } }, {}).toPromise();

    const columns = Object.keys(results.rawResponse.hits.hits[0]._source);
    const rows = results.rawResponse.hits.hits.map(hit => hit._source);
    console.log(
      'response.hits.hits[0]._source is ',
      JSON.stringify(results.rawResponse.hits.hits[0]._source)
    );

    console.log('columsn is ', columns);
    console.log('rows is ', rows);
    return {
      type: 'datatable',
      rows,
      columns,
    };
  },
});
