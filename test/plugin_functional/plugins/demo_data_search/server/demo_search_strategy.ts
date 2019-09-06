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
import { IDemoDataResponse, IDemoDataHit, TDemoDataSearchStrategyProvider } from './types';

function createHits(numberOfHits: number): IDemoDataHit[] {
  const hits: IDemoDataHit[] = [];
  for (let i = 0; i < numberOfHits; i++) {
    hits.push({
      title: (Math.random() * 2)
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(Math.random() * 10),
      message: (Math.random() * 2)
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(Math.random() * 30),
    });
  }
  return hits;
}

function createResponse(
  totalHitCount: number,
  numberOfHits: number,
  id?: string
): IDemoDataResponse {
  return {
    id,
    percentComplete: numberOfHits / totalHitCount,
    hits: createHits(numberOfHits),
  };
}

export const demoSearchStrategyProvider: TDemoDataSearchStrategyProvider = searchesInProgress => {
  return {
    search: async request => {
      const searchInProgress = request.id ? searchesInProgress[request.id] : undefined;
      const requestStartTime = searchInProgress ? searchInProgress.requestStartTime : Date.now();
      const timeElapsed = Date.now() - requestStartTime;
      const shouldFinish =
        timeElapsed > request.responseTime * 1000 ||
        (searchInProgress && request.totalHitCount === searchInProgress.response.hits.length);

      if (shouldFinish) {
        return searchInProgress
          ? {
              ...searchInProgress.response,
              percentComplete: 100,
              hits: {
                ...searchInProgress.response.hits,
                ...createHits(request.totalHitCount - searchInProgress.response.hits.length),
              },
            }
          : createResponse(request.totalHitCount, request.totalHitCount, request.id);
      }

      // Build a partial response to send back, base it off the total time it should take
      const hitsToCreateCount = Math.ceil(request.totalHitCount / request.responseTime);
      const hitsAlreadyCreated = searchInProgress ? searchInProgress.response.hits : [];
      const id = request.id || uuid.v4();
      const hitsAlreadyCreatedCount = hitsAlreadyCreated.length;

      const partialResponse = {
        id,
        percentComplete:
          ((hitsToCreateCount + hitsAlreadyCreatedCount) / request.totalHitCount) * 100,
        hits: [...hitsAlreadyCreated, ...createHits(hitsToCreateCount)],
      };
      searchesInProgress[id] = { request, response: partialResponse, requestStartTime };
      return partialResponse;
    },
  };
};
