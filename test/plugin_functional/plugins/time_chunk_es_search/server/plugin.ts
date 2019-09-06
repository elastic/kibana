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

import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/server';
import { ISearchSetup } from 'src/plugins/search/server';
import { IEsSearchResponse } from 'src/plugins/es_search/public';
import { ISearchesInProgress, ITimeChunkEsRequest } from './types';
import { TIME_CHUNK_ES_SEARCH_STRATEGY } from '../common';
import { timeChunkEsSearchStrategyProvider } from './time_chunk_es_search_strategy';

interface ITimeChunkEsSearchDeps {
  search: ISearchSetup;
}

export class TimeChunkEsSearchPlugin implements Plugin<void, void, ITimeChunkEsSearchDeps> {
  searchesInProgress: ISearchesInProgress = {};

  constructor(private initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup, deps: ITimeChunkEsSearchDeps) {
    deps.search.registerSearchStrategyProvider<ITimeChunkEsRequest, IEsSearchResponse<any>>(
      this.initializerContext.opaqueId,
      TIME_CHUNK_ES_SEARCH_STRATEGY,
      (context, caller, search) =>
        timeChunkEsSearchStrategyProvider({
          searchesInProgress: this.searchesInProgress,
          search,
          context,
        })
    );
  }

  public start() {}
  public stop() {}
}
