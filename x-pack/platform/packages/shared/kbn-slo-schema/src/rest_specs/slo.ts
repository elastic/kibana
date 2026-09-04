/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import {
  allOrAnyString as allOrAnyStringZod,
  groupingsSchema as groupingsSchemaZod,
  metaSchema as metaSchemaZod,
  remoteSchema as remoteSchemaZod,
  sloDefinitionSchema as sloDefinitionSchemaZod,
  summarySchema as summarySchemaZod,
} from '../schema/zod';
import type { SLODefinitionResponse } from './routes/find_definition';

const sloWithDataResponseSchemaZod = sloDefinitionSchemaZod.extend({
  summary: summarySchemaZod,
  groupings: groupingsSchemaZod,
  instanceId: allOrAnyStringZod,
  meta: metaSchemaZod.optional(),
  remote: remoteSchemaZod.optional(),
});

type SLOWithSummaryResponse = z.input<typeof sloWithDataResponseSchemaZod>;

export { sloWithDataResponseSchemaZod };
export type { SLODefinitionResponse, SLOWithSummaryResponse };
