/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { wiredStreamConfigDefinitonSchema } from '../stream_config';
import { elasticsearchAssetSchema } from '../common';

export const wiredStreamDefinitonSchema = z
  .object({
    name: z.string(),
    elasticsearch_assets: z.optional(elasticsearchAssetSchema),
    stream: wiredStreamConfigDefinitonSchema,
    dashboards: z.optional(z.array(z.string())),
  })
  .strict();

export type WiredStreamDefinition = z.infer<typeof wiredStreamDefinitonSchema>;
