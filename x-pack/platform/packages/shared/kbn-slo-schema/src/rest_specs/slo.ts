/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import {
  allOrAnyString,
  groupingsSchema,
  metaSchema,
  remoteSchema,
  sloDefinitionSchema,
  summarySchema,
} from '../schema';
import type { SLODefinitionResponse } from './routes/find_definition';

const sloWithDataResponseSchema = sloDefinitionSchema.extend({
  summary: summarySchema,
  groupings: groupingsSchema,
  instanceId: allOrAnyString,
  meta: metaSchema.optional(),
  remote: remoteSchema.optional(),
});

type SLOWithSummaryResponse = z.input<typeof sloWithDataResponseSchema>;

export { sloWithDataResponseSchema };
export type { SLODefinitionResponse, SLOWithSummaryResponse };
