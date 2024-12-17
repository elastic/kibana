/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { wiredStreamConfigDefinitonSchema } from '../stream_config';

export const wiredStreamDefinitonSchema = z
  .object({
    name: z.string(),
    elasticsearch_assets: z.optional(
      z.array(
        z.object({
          type: z.enum(['ingest_pipeline', 'component_template', 'index_template', 'data_stream']),
          id: z.string(),
        })
      )
    ),
    stream: wiredStreamConfigDefinitonSchema,
  })
  .strict();

export type WiredStreamDefinition = z.infer<typeof wiredStreamDefinitonSchema>;
