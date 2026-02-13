/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';

const searchSLODefinitionsParamsSchema = t.partial({
  query: t.partial({
    search: t.string,
    size: toNumberRt,
    searchAfter: t.string,
    remoteName: t.string,
  }),
});

type SearchSLODefinitionsParams = t.TypeOf<typeof searchSLODefinitionsParamsSchema.props.query>;

interface SearchSLODefinitionItem {
  id: string;
  name: string;
  groupBy: string[];
  remote?: { remoteName: string; kibanaUrl: string };
}

interface SearchSLODefinitionResponse {
  results: SearchSLODefinitionItem[];
  searchAfter?: string;
}

export { searchSLODefinitionsParamsSchema };
export type { SearchSLODefinitionsParams, SearchSLODefinitionResponse, SearchSLODefinitionItem };
