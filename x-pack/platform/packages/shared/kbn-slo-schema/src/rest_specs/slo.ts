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

const sloWithDataResponseSchema = sloDefinitionSchema
  .extend({
    summary: summarySchema,
    groupings: groupingsSchema,
    instanceId: allOrAnyString.describe(
      "the value derived from the groupBy field, if present, otherwise '*'"
    ),
    meta: metaSchema.optional(),
    remote: remoteSchema.optional(),
  })
  .meta({
    id: 'SLOWithSummaryResponse',
    description: 'The SLO definition with its computed summary',
    additionalProperties: true,
  });

type SLOWithSummaryResponse = z.input<typeof sloWithDataResponseSchema>;

export { sloWithDataResponseSchema };
export type { SLODefinitionResponse, SLOWithSummaryResponse };
