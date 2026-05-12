/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const discoverySchema = z.object({
  '@timestamp': z.iso.datetime(),
  kind: z.enum(['finding', 'clearance']),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  criticality: z.number().int(),
  grouped_into: z.string().optional(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  grouped_discovery_ids: z.array(z.string()),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  detections: z.array(
    z.object({
      rule_uuid: z.string(),
    })
  ),
});

export type Discovery = z.infer<typeof discoverySchema>;
