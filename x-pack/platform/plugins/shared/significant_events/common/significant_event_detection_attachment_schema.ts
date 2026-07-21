/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHANGE_POINT_TYPES } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';

export const lifecycleDetectionAttachmentSchema = z.object({
  '@timestamp': z.string(),
  detection_id: z.string(),
  rule_name: z.string(),
  rule_uuid: z.string().optional(),
  stream_name: z.string(),
  change_point_type: z.enum(CHANGE_POINT_TYPES),
});
