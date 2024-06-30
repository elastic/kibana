/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { arrayOfStringsSchema } from './common';

const entitySchema = z.object({
  entity: z.object({
    id: z.string(),
    identityFields: arrayOfStringsSchema,
    displayName: z.string(),
    spaceId: z.string(),
    metrics: z.record(z.string(), z.number()),
  }),
});

export const entitySummarySchema = z.intersection(
  entitySchema.extend({
    lastSeenTimestamp: z.string(),
    firstSeenTimestamp: z.string(),
  }),
  z.record(z.string(), z.string().or(z.number()))
);

export const entityHistorySchema = z.intersection(
  entitySchema.extend({ ['@timestamp']: z.string() }),
  z.record(z.string(), z.string().or(z.number()))
);
