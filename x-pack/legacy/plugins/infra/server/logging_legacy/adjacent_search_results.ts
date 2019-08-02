/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';
import { SearchParams } from 'elasticsearch';
import * as Joi from 'joi';

import {
  AdjacentSearchResultsApiPostPayload,
  AdjacentSearchResultsApiPostResponse,
} from '../../common/http_api';
import { LogEntryFieldsMapping, LogEntryTime } from '../../common/log_entry';
import { SearchResult } from '../../common/log_search_result';
import {
  InfraBackendFrameworkAdapter,
  InfraDatabaseSearchResponse,
  InfraWrappableRequest,
} from '../lib/adapters/framework';
import { convertHitToSearchResult } from './converters';
import { isHighlightedHit, SortedHit } from './elasticsearch';
import { fetchLatestTime } from './latest_log_entries';
import { indicesSchema, logEntryFieldsMappingSchema, logEntryTimeSchema } from './schemas';

const INITIAL_HORIZON_OFFSET = 1000 * 60 * 60 * 24;
const MAX_HORIZON = 9999999999999;

export const initAdjacentSearchResultsRoutes = (framework: InfraBackendFrameworkAdapter) => {
  const callWithRequest = framework.callWithRequest;

  framework.registerRoute<
    InfraWrappableRequest<AdjacentSearchResultsApiPostPayload>,
    Promise<AdjacentSearchResultsApiPostResponse>
  >({
    options: {
      validate: {
        payload: Joi.object().keys({
          after: Joi.number()
            .min(0)
            .default(0),
          before: Joi.number()
            .min(0)
            .default(0),
          fields: logEntryFieldsMappingSchema.required(),
          indices: indicesSchema.required(),
          query: Joi.string().required(),
          target: logEntryTimeSchema.required(),
        }),
      },
    },
    handler: async (request, h) => {
      const timings = {
        esRequestSent: Date.now(),
        esResponseProcessed: 0,
      };

      try {
        const search = <Hit>(params: SearchParams) =>
          callWithRequest<Hit, any>(request, 'search', params);

        const latestTime = await fetchLatestTime(
          search,
          request.payload.indices,
          request.payload.fields.time
        );
        const searchResultsAfterTarget = await fetchSearchResults(
          search,
          request.payload.indices,
          request.payload.fields,
          {
            tiebreaker: request.payload.target.tiebreaker - 1,
            time: request.payload.target.time,
          },
          request.payload.after,
          'asc',
          request.payload.query,
          request.payload.target.time + INITIAL_HORIZON_OFFSET,
          latestTime
        );
        const searchResultsBeforeTarget = (await fetchSearchResults(
          search,
          request.payload.indices,
          request.payload.fields,
          request.payload.target,
          request.payload.before,
          'desc',
          request.payload.query,
          request.payload.target.time - INITIAL_HORIZON_OFFSET
        )).reverse();

        timings.esResponseProcessed = Date.now();

        return {
          results: {
            after: searchResultsAfterTarget,
            before: searchResultsBeforeTarget,
          },
          timings,
        };
      } catch (requestError) {
        throw boomify(requestError);
      }
    },
    method: 'POST',
    path: '/api/logging/adjacent-search-results',
  });
};

export async function fetchSearchResults(
  search: <Hit>(params: SearchParams) => Promise<InfraDatabaseSearchResponse<Hit>>,
  indices: string[],
  fields: LogEntryFieldsMapping,
  target: LogEntryTime,
  size: number,
  direction: 'asc' | 'desc',
  query: string,
  horizon: number,
  maxHorizon: number = MAX_HORIZON
): Promise<SearchResult[]> {
  if (size <= 0) {
    return [];
  }

  const request = {
    allowNoIndices: true,
    body: {
      _source: false,
      highlight: {
        boundary_scanner: 'word',
        fields: {
          [fields.message]: {},
        },
        fragment_size: 1,
        number_of_fragments: 100,
        post_tags: [''],
        pre_tags: [''],
      },
      query: {
        bool: {
          filter: [
            {
              query_string: {
                default_field: fields.message,
                default_operator: 'AND',
                query,
              },
            },
            {
              range: {
                [fields.time]: {
                  [direction === 'asc' ? 'gte' : 'lte']: target.time,
                  [direction === 'asc' ? 'lte' : 'gte']: horizon,
                },
              },
            },
          ],
        },
      },
      search_after: [target.time, target.tiebreaker],
      size,
      sort: [{ [fields.time]: direction }, { [fields.tiebreaker]: direction }],
    },
    ignoreUnavailable: true,
    index: indices,
  };
  const response = await search<SortedHit>(request);

  const hits = response.hits.hits as SortedHit[];
  const nextHorizon = horizon + (horizon - target.time);

  if (hits.length >= size || nextHorizon < 0 || nextHorizon > maxHorizon) {
    const filteredHits = hits.filter(isHighlightedHit);
    return filteredHits.map(convertHitToSearchResult(fields));
  } else {
    return fetchSearchResults(
      search,
      indices,
      fields,
      target,
      size,
      direction,
      query,
      nextHorizon,
      maxHorizon
    );
  }
}
