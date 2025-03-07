/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';
import { ElasticsearchIndexWithIngestion } from '../../../server/types/indices';

export interface FetchIndexApiParams {
  indexName: string;
  http?: HttpSetup;
}

export type FetchIndexApiResponse = ElasticsearchIndexWithIngestion & {
  has_in_progress_syncs?: boolean;
};

export const fetchIndex = async ({
  indexName,
  http,
}: FetchIndexApiParams): Promise<FetchIndexApiResponse | undefined> => {
  const route = `/internal/enterprise_search/indices/${indexName}`;

  return await http?.get<FetchIndexApiResponse>(route);
};

export const FetchIndexApiLogic = createApiLogic(['fetch_index_api_logic'], fetchIndex, {
  clearFlashMessagesOnMakeRequest: false,
  showErrorFlash: false,
});

export type FetchIndexActions = Actions<FetchIndexApiParams, FetchIndexApiResponse>;
