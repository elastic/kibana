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
import type { SLODefinitionResponse } from './routes/find_definition';

const sloWithDataResponseSchema = t.intersection([
  sloDefinitionSchema,
  t.type({ summary: summarySchema, groupings: groupingsSchema, instanceId: allOrAnyString }),
  t.partial({
    meta: metaSchema,
    remote: remoteSchema,
  }),
]);

type SLOWithSummaryResponse = t.OutputOf<typeof sloWithDataResponseSchema>;

export { sloWithDataResponseSchema };
export type { SLODefinitionResponse, SLOWithSummaryResponse };
