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

import uuid from 'uuid';
import { ISearchContext } from 'src/plugins/search/server';
import { ISearch } from 'src/plugins/search/server/i_search';
import { IEsSearchResponse } from '../../../../../src/plugins/es_search/public';
import { ES_SEARCH_STRATEGY } from '../../../../../src/plugins/es_search/server';
import { ISearchesInProgress, ITimeChunkEsRequest } from './types';

export const timeChunkEsSearchStrategyProvider = ({
  context,
  search,
  searchesInProgress,
}: {
  context: ISearchContext;
  search: ISearch;
  searchesInProgress: ISearchesInProgress;
}) => {
  return {
    search: async (request: ITimeChunkEsRequest) => {
      const searchInProgress = request.id ? searchesInProgress[request.id] : undefined;
      const sectionFromTime = searchInProgress
        ? searchInProgress.lastToTime
        : request.timeRange.from;
      const sectionToTime = Math.min(sectionFromTime + request.timeIncrement, request.timeRange.to);

      if (sectionFromTime > request.timeRange.to) {
        throw new Error('bad calculations');
      }

      const requestToEs = {
        ...request,
        params: {
          ...request.params,
          body: {
            ...request.params.body,
            query: {
              bool: {
                must: [
                  {
                    ...request.params.body.query,
                  },
                  {
                    range: {
                      [request.timeRange.timeField]: {
                        gt: sectionFromTime,
                        lt: sectionToTime,
                        format: 'epoch_second',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
      const sectionsComplete = (request.timeRange.to - sectionFromTime) / request.timeIncrement;
      const totalSections = (request.timeRange.to - request.timeRange.from) / request.timeIncrement;
      const percentComplete = ((totalSections - sectionsComplete) / totalSections) * 100;

      const id = request.id || uuid.v4();

      const response = (await search(requestToEs, ES_SEARCH_STRATEGY)) as IEsSearchResponse<any>;

      if (percentComplete < 100) {
        searchesInProgress[id] = { request, response, lastToTime: sectionToTime };
      }

      return {
        ...response,
        percentComplete,
        id,
      };
    },
  };
};
