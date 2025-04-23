/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

interface CreateApiIndexValue {
  index: string;
}

export interface CreateApiIndexApiLogicArgs {
  deleteExistingConnector?: boolean;
  indexName: string;
  language: string | null;
  http?: HttpSetup;
}

export interface CreateApiIndexApiLogicResponse {
  indexName: string;
}

export const createApiIndex = async ({
  indexName,
  language,
  http,
}: CreateApiIndexApiLogicArgs): Promise<CreateApiIndexApiLogicResponse | undefined> => {
  const route = '/internal/content_connectors/indices';
  const params = {
    index_name: indexName,
    language,
  };
  const result = await http?.post<CreateApiIndexValue>(route, {
    body: JSON.stringify(params),
  });
  return result
    ? {
        indexName: result.index,
      }
    : undefined;
};

export const CreateApiIndexApiLogic = createApiLogic(
  ['create_api_index_api_logic'],
  createApiIndex
);

export type CreateApiIndexApiLogicActions = Actions<
  CreateApiIndexApiLogicArgs,
  CreateApiIndexApiLogicResponse
>;
