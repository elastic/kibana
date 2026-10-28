/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ProfilingSchema } from '@kbn/profiling-utils';

/** Profiling schema to query, Universal Profiling (ECS) when not sent */
export const profilingSchemaQuerySchema = lazySchema(() =>
  z.object({
    schema: z.enum(ProfilingSchema).optional(),
  })
);
