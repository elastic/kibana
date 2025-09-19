/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { casesSchema as casesSchemaV4 } from './v4';

export const casesSchema = // v5
  casesSchemaV4.extends({
    /* Same fields, just added new multi-type `.text` to increment_id */
  });
