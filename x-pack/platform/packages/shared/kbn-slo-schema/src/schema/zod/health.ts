/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const transformHealthSchema = z.object({
  isProblematic: z.boolean(),
  missing: z.boolean(),
  status: z.union([z.literal('healthy'), z.literal('unhealthy'), z.literal('unavailable')]),
  state: z.union([
    z.literal('stopped'),
    z.literal('started'),
    z.literal('stopping'),
    z.literal('aborting'),
    z.literal('failed'),
    z.literal('indexing'),
    z.literal('unavailable'),
  ]),
  stateMatches: z.boolean().optional(),
});

type TransformHealthResponse = z.output<typeof transformHealthSchema>;

export type { TransformHealthResponse };
export { transformHealthSchema };
