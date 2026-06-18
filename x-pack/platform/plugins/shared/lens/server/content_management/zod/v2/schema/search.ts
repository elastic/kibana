/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchOptionsSchema, searchResultSchema } from '@kbn/content-management-utils/zod';

import { lensSavedObjectSchemaV2 } from './common';

export const lensCMSearchOptionsSchema = searchOptionsSchema
  .pick({
    // TODO: add support for more search options
    fields: true,
    searchFields: true,
  })
  .strict();

export const lensCMSearchResultSchema = searchResultSchema(lensSavedObjectSchemaV2);
