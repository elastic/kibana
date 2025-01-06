/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { wiredStreamDefinitonSchema } from './wired_stream';
import { ingestStreamDefinitonSchema } from './ingest_stream';

export const streamDefintionSchema = z.union([
  wiredStreamDefinitonSchema,
  ingestStreamDefinitonSchema,
]);

export type StreamDefinition = z.infer<typeof streamDefintionSchema>;
