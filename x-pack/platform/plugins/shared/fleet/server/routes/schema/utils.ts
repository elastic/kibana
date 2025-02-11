/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
export const ListResponseSchema = (itemSchema: Type<any>) =>
  schema.object({
    items: schema.arrayOf(itemSchema),
    total: schema.number(),
    page: schema.number(),
    perPage: schema.number(),
  });
