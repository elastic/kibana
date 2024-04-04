/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  allOrAnyString,
  groupingsSchema,
  metaSchema,
  remoteSchema,
  sloDefinitionSchema,
  summarySchema,
} from '../schema';

const sloWithDataResponseSchema = t.intersection([
  sloDefinitionSchema,
  t.type({ summary: summarySchema, groupings: groupingsSchema }),
  t.partial({
    instanceId: allOrAnyString, // TODO Kevin: can be moved to t.type() since we always backfill it with '*'
    meta: metaSchema,
    remote: remoteSchema,
  }),
]);

type SLODefinitionResponse = t.OutputOf<typeof sloDefinitionSchema>; // TODO Kevin: returned from some APIs: put, reset, get_definition, inspect
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithDataResponseSchema>; // TODO Kevin: Find a better name... We include more things than just the Summary.

export { sloWithDataResponseSchema };
export type { SLODefinitionResponse, SLOWithSummaryResponse };
