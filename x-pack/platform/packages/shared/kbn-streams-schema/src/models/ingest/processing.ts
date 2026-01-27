/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';

export interface IngestStreamProcessing extends StreamlangDSL {
  updated_at: string;
}

export const ingestStreamProcessingSchema = streamlangDSLSchema.merge(
  z.object({
    updated_at: z.string().datetime(),
  })
);
