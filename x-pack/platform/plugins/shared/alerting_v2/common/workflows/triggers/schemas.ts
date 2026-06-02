/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleKindSchema, tagsSchema } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';

export const ruleSnapshotSchema = z.object({
  ruleId: z.string().describe('Unique rule identifier.'),
  spaceId: z.string().describe('Kibana space ID where the rule lives.'),
  name: z.string().describe('Rule display name.'),
  kind: ruleKindSchema.describe('Rule kind: alert or signal.'),
  query: z.string().describe('ES|QL detection query (evaluation.query.base).'),
  enabled: z.boolean().describe('Whether the rule is enabled after the operation.'),
  tags: tagsSchema.describe('Rule tags for categorization and workflow trigger filtering.'),
});

export type RuleSnapshot = z.infer<typeof ruleSnapshotSchema>;

export const ruleLifecycleEventSchema = z.object({
  rules: z.array(ruleSnapshotSchema).min(1).describe('Rules affected by this operation.'),
});

export type RuleLifecycleEvent = z.infer<typeof ruleLifecycleEventSchema>;
