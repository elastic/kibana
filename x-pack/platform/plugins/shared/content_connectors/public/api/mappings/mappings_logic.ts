/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface GetMappingsArgs {
  indexName: string;
  http?: HttpSetup;
}

export type GetMappingsResponse = IndicesGetMappingIndexMappingRecord;

export type GetMappingsActions = Actions<GetMappingsArgs, GetMappingsResponse>;

export const getMappings = async ({ indexName, http }: GetMappingsArgs) => {
  const route = `/internal/content_connectors/mappings/${indexName}`;

  return await http?.get<IndicesGetMappingIndexMappingRecord>(route);
};

export const mappingsWithPropsApiLogic = (indexName: string) =>
  createApiLogic(['mappings_api_logic_with_props', indexName], getMappings);

export const MappingsApiLogic = createApiLogic(['mappings_api_logic'], getMappings);
