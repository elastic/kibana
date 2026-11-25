/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

const searchSLODefinitionsParamsSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      size: z.coerce.number().optional(),
      searchAfter: z.string().optional(),
      remoteName: z.string().optional(),
    })
    .optional(),
});

type SearchSLODefinitionsParams = NonNullable<
  z.output<typeof searchSLODefinitionsParamsSchema.shape.query>
>;

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
