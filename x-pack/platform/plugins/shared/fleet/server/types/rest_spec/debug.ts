/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const FetchIndexRequestSchema = {
  body: schema.object({
    index: schema.string(),
  }),
};

export const FetchSavedObjectsRequestSchema = {
  body: schema.object({
    type: schema.string(),
    name: schema.string(),
  }),
};

export const FetchSavedObjectNamesRequestSchema = {
  body: schema.object({
    type: schema.string(),
  }),
};
