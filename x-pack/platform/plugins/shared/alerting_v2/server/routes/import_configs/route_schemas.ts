/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { entityIdSchema } from '@kbn/alerting-v2-schemas';

/** Path params schema for routes that accept a single import config ID. */
export const importConfigIdParamsSchema = lazySchema(() =>
  z
    .object({
      id: entityIdSchema.describe(
        'The ID of the import. Copy it from the response when you create an import, fetch one import, or fetch the import list.'
      ),
    })
    .strict()
);
