/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const verdictSchema = z.object({
  '@timestamp': z.iso.datetime(),
  verdict: z.string().optional(),
  verdict_id: z.string(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  recommended_action: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  verdict_summary: z.string().optional(),
  assessment_note: z.string().optional(),
  recommendations: z.string().optional(),
});

export type Verdict = z.infer<typeof verdictSchema>;
