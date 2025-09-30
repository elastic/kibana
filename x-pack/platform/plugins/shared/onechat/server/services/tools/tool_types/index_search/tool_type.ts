/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { IndexSearchToolConfig } from '@kbn/onechat-common/tools';
import type { ToolTypeDefinition } from '../definitions';
import { createHandler } from './create_handler';

const searchSchema = z.object({
  nlQuery: z.string().describe('A natural language query expressing the search request'),
});

type SearchSchemaType = typeof searchSchema;

export const getIndexSearchToolType = (): ToolTypeDefinition<
  ToolType.index_search,
  IndexSearchToolConfig,
  SearchSchemaType
> => {
  return {
    type: ToolType.index_search,
    getGeneratedProps: (config) => {
      return {
        handler: createHandler(),
        getSchema: () => searchSchema,
      };
    },
  };
};
