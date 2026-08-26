/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { tagsSchema } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';

const MAX_RULE_SNAPSHOT_FIELD_LENGTH = 1024;

export const ruleSnapshotSchema = z.object({
  ruleId: z
    .string()
    .max(MAX_RULE_SNAPSHOT_FIELD_LENGTH)
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleLifecycle.schema.ruleId', {
        defaultMessage:
          'Unique identifier of the rule that was created, updated, deleted, enabled, or disabled.',
      })
    ),
  spaceId: z
    .string()
    .max(MAX_RULE_SNAPSHOT_FIELD_LENGTH)
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleLifecycle.schema.spaceId', {
        defaultMessage: 'ID of the Kibana space where the operation occurred.',
      })
    ),
  tags: tagsSchema.describe(
    i18n.translate('xpack.alertingV2.triggers.ruleLifecycle.schema.tags', {
      defaultMessage: 'Rule tags for categorization.',
    })
  ),
});

export type RuleSnapshot = z.infer<typeof ruleSnapshotSchema>;

export const ruleLifecycleEventSchema = z.object({
  rule: ruleSnapshotSchema.describe(
    i18n.translate('xpack.alertingV2.triggers.ruleLifecycle.schema.rule', {
      defaultMessage: 'Rule affected by this operation.',
    })
  ),
});

export type RuleLifecycleEvent = z.infer<typeof ruleLifecycleEventSchema>;
