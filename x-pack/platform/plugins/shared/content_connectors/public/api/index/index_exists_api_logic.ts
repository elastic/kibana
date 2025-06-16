/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface IndexExistsApiParams {
  indexName: string;
  http?: HttpSetup;
}

export interface IndexExistsApiResponse {
  exists: boolean;
  indexName: string;
}

export const fetchIndexExists = async ({
  indexName,
  http,
}: IndexExistsApiParams): Promise<IndexExistsApiResponse | undefined> => {
  const route = `/internal/content_connectors/indices/${indexName}/exists`;

  if (http) {
    const { exists } = await http.get<{ exists: boolean }>(route);
    return { exists, indexName };
  }
};

export const IndexExistsApiLogic = createApiLogic(['index_exists_api_logic'], fetchIndexExists);

export type IndexExistsApiLogicActions = Actions<IndexExistsApiParams, IndexExistsApiResponse>;
