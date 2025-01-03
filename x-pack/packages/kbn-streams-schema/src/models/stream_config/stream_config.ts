/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ingestStreamConfigDefinitonSchema } from './ingest_stream_config';
import { wiredStreamConfigDefinitonSchema } from './wired_stream_config';

export const streamConfigDefinitionSchema = z.union([
  wiredStreamConfigDefinitonSchema,
  ingestStreamConfigDefinitonSchema,
]);

export type StreamConfigDefinition = z.infer<typeof streamConfigDefinitionSchema>;
