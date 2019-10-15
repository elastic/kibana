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
import { DataPluginSetup } from 'src/plugins/data/server/plugin';
import {
  EQL_SEARCH_STRATEGY,
  IEqlSearchResponse,
  IEqlSearchRequest,
  SQL_SEARCH_STRATEGY,
  ISqlSearchRequest,
  ISqlSearchResponse,
} from '../common';
import { eqlSearchStrategyProvider } from './eql_search_strategy';
import { sqlSearchStrategyProvider } from './sql_search_strategy';

interface Deps {
  data: DataPluginSetup;
}

/**
 * Add the typescript mappings for our search strategy to the request and
 * response types. This allows typescript to require the right shapes if
 * making the call:
 * const response = context.search.search(request, DEMO_SEARCH_STRATEGY);
 *
 * If the caller does not pass in the right `request` shape, typescript will
 * complain. The caller will also get a typed response.
 */
declare module '../../../../../src/plugins/data/server' {
  export interface IRequestTypesMap {
    [EQL_SEARCH_STRATEGY]: IEqlSearchRequest;
    [SQL_SEARCH_STRATEGY]: ISqlSearchRequest;
  }

  export interface IResponseTypesMap {
    [EQL_SEARCH_STRATEGY]: IEqlSearchResponse;
    [SQL_SEARCH_STRATEGY]: ISqlSearchResponse;
  }
}

export class DemoDataPlugin implements Plugin<void, void, Deps> {
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, deps: Deps) {
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      EQL_SEARCH_STRATEGY,
      eqlSearchStrategyProvider
    );
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      SQL_SEARCH_STRATEGY,
      sqlSearchStrategyProvider
    );
  }

  public start() {}
  public stop() {}
}
