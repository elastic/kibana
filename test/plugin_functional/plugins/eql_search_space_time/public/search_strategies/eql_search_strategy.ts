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

import { Observable } from 'rxjs';
import {
  ISearchContext,
  SYNC_SEARCH_STRATEGY,
  ISearchGeneric,
} from '../../../../../../src/plugins/data/public';
import {
  TSearchStrategyProvider,
  ISearchStrategy,
} from '../../../../../../src/plugins/data/public';

import { EQL_SEARCH_STRATEGY, IEqlSearchResponse } from '../../common';

export const eqlSearchStrategyProvider: TSearchStrategyProvider<typeof EQL_SEARCH_STRATEGY> = (
  context: ISearchContext,
  search: ISearchGeneric
): ISearchStrategy<typeof EQL_SEARCH_STRATEGY> => {
  return {
    search: (request, options) =>
      search(
        { ...request, serverStrategy: EQL_SEARCH_STRATEGY },
        options,
        SYNC_SEARCH_STRATEGY
      ) as Observable<IEqlSearchResponse>,
  };
};
