/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { INPUT_THROTTLE_DELAY_MS } from '../../../common/constants';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface FetchAvailabeIndicesApiParams {
  searchQuery?: string;
  http?: HttpSetup;
}
export interface FetchAvailableIndicesApiResponse {
  indexNames: string[];
  meta: Meta;
}

export const fetchAvailableIndices = async ({
  searchQuery,
  http,
}: FetchAvailabeIndicesApiParams): Promise<FetchAvailableIndicesApiResponse | undefined> => {
  const route = '/internal/content_connectors/connectors/available_indices';
  const query = { search_query: searchQuery || null };
  const response = await http?.get<FetchAvailableIndicesApiResponse>(route, { query });
  return response;
};

export const FetchAvailableIndicesAPILogic = createApiLogic(
  ['content', 'fetch_available_indices_api_logic'],
  fetchAvailableIndices,
  {
    requestBreakpointMS: INPUT_THROTTLE_DELAY_MS,
  }
);

export type FetchAvailableIndicesApiActions = Actions<
  FetchAvailabeIndicesApiParams,
  FetchAvailableIndicesApiResponse
>;
