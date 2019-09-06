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

import { IKibanaSearchResponse, IKibanaSearchRequest } from 'src/plugins/search/server';
import { ISearchStrategy } from 'src/plugins/search/server';

export interface IDemoDataRequest extends IKibanaSearchRequest {
  responseTime: number;
  totalHitCount: number;
}

export interface IDemoDataHit {
  title: string;
  message: string;
}

export type IDemoDataResponse = IKibanaSearchResponse<IDemoDataHit>;

export interface ISearchesInProgress {
  [id: string]: {
    request: IDemoDataRequest;
    response: IDemoDataResponse;
    requestStartTime: number;
  };
}

export type TDemoDataSearchStrategyProvider = (
  searchesInProgress: ISearchesInProgress
) => ISearchStrategy<IDemoDataRequest, IDemoDataResponse>;
