/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertDeleteCategoryIds } from '../../../../constants';

export const alertDeletePreviewQuerySchema = schema.object({
  active_alert_delete_threshold: schema.maybe(
    schema.number({
      min: 1,
      max: 1000,
      meta: {
        description: 'Threshold (in days) for deleting active alerts older than this value',
      },
    })
  ),
  inactive_alert_delete_threshold: schema.maybe(
    schema.number({
      min: 1,
      max: 1000,
      meta: {
        description:
          'Threshold (in days) for deleting inactive alerts (recovered/closed/untracked) older than this value',
      },
    })
  ),
  category_ids: schema.maybe(
    schema.oneOf([
      schema.arrayOf(
        schema.oneOf([
          schema.literal(alertDeleteCategoryIds.SECURITY_SOLUTION),
          schema.literal(alertDeleteCategoryIds.OBSERVABILITY),
          schema.literal(alertDeleteCategoryIds.MANAGEMENT),
        ]),
        {
          minSize: 1,
        }
      ),
      schema.literal(alertDeleteCategoryIds.SECURITY_SOLUTION),
      schema.literal(alertDeleteCategoryIds.OBSERVABILITY),
      schema.literal(alertDeleteCategoryIds.MANAGEMENT),
    ])
  ),
});

export const alertDeletePreviewResponseSchema = schema.object({
  affected_alert_count: schema.number(),
});
