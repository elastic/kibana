/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const alertDeletionCategoryIdTypes = {
  OBSERVABILITY: 'observability',
  SECURITY_SOLUTION: 'securitySolution',
  MANAGEMENT: 'management',
} as const;

export const updateQueryDelaySettingsBodySchema = schema.object({
  delay: schema.number(),
});

export const updateAlertDeletionSettingsBodySchema = schema.object({
  is_active_alerts_deletion_enabled: schema.boolean({
    meta: {
      description: 'Enable deletion of active alerts when set to true',
    },
  }),
  active_alerts_deletion_threshold: schema.number({
    min: 1,
    max: 1000,
    meta: {
      description:
        'Threshold (in days) for deleting active alerts older than this value, applies only when deletion is enabled',
    },
  }),
  is_inactive_alerts_deletion_enabled: schema.boolean({
    meta: {
      description:
        'Enable deletion of inactive alerts (recovered/closed/untracked) when set to true',
    },
  }),
  inactive_alerts_deletion_threshold: schema.number({
    min: 1,
    max: 1000,
    meta: {
      description:
        'Threshold (in days) for deleting inactive alerts (recovered/closed/untracked) older than this value, applies only when deletion is enabled',
    },
  }),
  category_ids: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(alertDeletionCategoryIdTypes.OBSERVABILITY),
        schema.literal(alertDeletionCategoryIdTypes.SECURITY_SOLUTION),
        schema.literal(alertDeletionCategoryIdTypes.MANAGEMENT),
      ])
    )
  ),
});
