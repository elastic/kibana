/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';

export const alertActionEnvelopeSchema = z
  .object({
    occurredAt: z.iso.datetime().describe(
      i18n.translate('xpack.alertingVTwo.triggers.alertAction.schema.occurredAt', {
        defaultMessage: 'ISO timestamp of when the action occurred.',
      })
    ),
    groupHash: z
      .string()
      .min(1)
      .max(128)
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.alertAction.schema.groupHash', {
          defaultMessage: 'Stable hash of the alert series the alert belongs to.',
        })
      ),
    alertId: z
      .string()
      .min(1)
      .max(256)
      .nullable()
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.alertAction.schema.alertId', {
          defaultMessage:
            'Identifier of the alert the action was applied to, or null for series-level actions that target the series as a whole.',
        })
      ),
    ruleId: z
      .string()
      .min(1)
      .max(256)
      .nullable()
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.alertAction.schema.ruleId', {
          defaultMessage:
            'Identifier of the alerting rule the alert belongs to, or null for external-source alerts not tied to a Kibana rule.',
        })
      ),
    spaceId: z
      .string()
      .min(1)
      .max(256)
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.alertAction.schema.spaceId', {
          defaultMessage: 'Kibana space the alert lives in.',
        })
      ),
    actorUid: z
      .string()
      .min(1)
      .max(256)
      .nullable()
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.alertAction.schema.actorUid', {
          defaultMessage:
            'User-profile uid of the actor who performed the action, or null when performed by an internal/system context.',
        })
      ),
  })
  .strict();

export type AlertActionEnvelopePayload = z.infer<typeof alertActionEnvelopeSchema>;
