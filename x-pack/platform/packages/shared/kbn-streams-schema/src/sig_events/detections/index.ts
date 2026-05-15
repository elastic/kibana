/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const detectionSchema = z.object({
  '@timestamp': z.iso.datetime(),
  detection_id: z.string(),
  silent: z.boolean().optional(),
  superseded: z.boolean().optional(),
  superseded_at: z.iso.datetime().optional(),
  rule_uuid: z.string(),
  rule_name: z.string(),
  stream: z.string(),
});

export type Detection = z.infer<typeof detectionSchema>;
