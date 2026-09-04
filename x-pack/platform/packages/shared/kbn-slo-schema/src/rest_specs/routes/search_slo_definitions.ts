/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_KEYWORD_LENGTH } from '../../schema/zod/limits';

const searchSLODefinitionsParamsSchema = z.object({
  query: z
    .object({
      search: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      size: z.coerce.number().optional(),
      searchAfter: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      remoteName: z.string().optional(),
    })
    .optional(),
});

type SearchSLODefinitionsParams = z.output<typeof searchSLODefinitionsParamsSchema.shape.query>;

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
