/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { searchOptionsSchemas, searchResultSchema } from '@kbn/content-management-utils';

import { lensSavedObjectSchemaV2 } from './common';
import { pickFromObjectSchema } from '../../../utils';

export const lensCMSearchOptionsSchema = schema.object(
  {
    // TODO: add support for more search options
    ...pickFromObjectSchema(searchOptionsSchemas, ['fields', 'searchFields']),
  },
  {
    unknowns: 'forbid',
  }
);

export const lensCMSearchResultSchema = searchResultSchema(lensSavedObjectSchemaV2);
