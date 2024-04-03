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

const sloResponseSchema = t.intersection([
  sloDefinitionSchema,
  t.partial({
    instanceId: allOrAnyString, // TODO Kevin: can be moved to t.type() since we always backfill it with '*'
  }),
]);

const sloWithDataResponseSchema = t.intersection([
  sloDefinitionSchema,
  t.type({ summary: summarySchema, groupings: groupingsSchema }),
  t.partial({
    instanceId: allOrAnyString, // TODO Kevin: can be moved to t.type() since we always backfill it with '*'
    meta: metaSchema,
    remote: remoteSchema,
  }),
]);

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithDataResponseSchema>;

export { sloWithDataResponseSchema };
export type { SLOResponse, SLOWithSummaryResponse };
