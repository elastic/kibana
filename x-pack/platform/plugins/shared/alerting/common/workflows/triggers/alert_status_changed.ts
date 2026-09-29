/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/**
 * Fires once per alert instance per genuine state transition: when a lifecycle
 * rule produces a new active alert, or when an alert recovers.
 *
 * Ongoing alerts that have not changed state do NOT re-fire.
 * Scoped to lifecycle rule types (autoRecoverAlerts === true).
 */
export const AlertStatusChangedV1TriggerId = 'alerting.v1.alertStatusChanged' as const;

export const alertStatusChangedV1EventSchema = z.object({
  rule: z
    .object({
      id: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.id', {
          defaultMessage: 'Rule ID.',
        })
      ),
      name: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.name', {
          defaultMessage: 'Rule name.',
        })
      ),
      spaceId: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.spaceId', {
          defaultMessage: 'Kibana space ID where the rule lives.',
        })
      ),
      consumer: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.consumer', {
          defaultMessage: 'Plugin that owns this rule (e.g. "alerts", "observability").',
        })
      ),
      ruleTypeId: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.ruleTypeId', {
          defaultMessage: 'Rule type identifier.',
        })
      ),
      tags: z.array(z.string()).describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.tags', {
          defaultMessage: 'Rule tags.',
        })
      ),
      ruleCategory: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule.ruleCategory', {
          defaultMessage: "Rule type display name (e.g. 'Elasticsearch query').",
        })
      ),
    })
    .describe(
      i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.rule', {
        defaultMessage: 'Identity of the rule whose execution produced this event.',
      })
    ),
  alert: z
    .object({
      id: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.alert.id', {
          defaultMessage:
            'Alert instance ID (the key the rule type uses to identify this instance).',
        })
      ),
      uuid: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.alert.uuid', {
          defaultMessage:
            'Stable UUID for this alert instance. Matches kibana.alert.uuid in the alert document.',
        })
      ),
      status: z.enum(['active', 'recovered']).describe(
        i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.alert.status', {
          defaultMessage:
            'Alert status at time of transition: "active" when the alert fires, "recovered" when it resolves.',
        })
      ),
      actionGroup: z
        .string()
        .nullable()
        .describe(
          i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.alert.actionGroup', {
            defaultMessage:
              'Action group at time of transition. Current group for active alerts; ' +
              'last scheduled group for recovered alerts. Null if none was recorded.',
          })
        ),
      start: z
        .string()
        .nullable()
        .describe(
          i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.alert.start', {
            defaultMessage:
              'ISO-8601 timestamp when this alert instance first became active. ' +
              'Null for recovered alerts that have no start in state.',
          })
        ),
    })
    .describe(
      i18n.translate('xpack.alerting.triggers.alertStatusChanged.schema.alert', {
        defaultMessage: 'The individual alert instance that changed status.',
      })
    ),
});

export type AlertStatusChangedV1Payload = z.infer<typeof alertStatusChangedV1EventSchema>;

export const alertStatusChangedV1TriggerDefinition: CommonTriggerDefinition<
  typeof alertStatusChangedV1EventSchema
> = {
  id: AlertStatusChangedV1TriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedV1EventSchema,
  title: i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.title', {
    defaultMessage: 'Alert status changed',
  }),
  description: i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.description', {
    defaultMessage:
      'Fires once per alert instance when it becomes active or recovers. ' +
      'Ongoing alerts that have not changed status do not re-fire.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alerting.workflowTriggers.alertStatusChanged.documentation.details',
      {
        defaultMessage:
          'Fires once per alert instance per genuine status transition. ' +
          'One alert becoming active = one trigger event. One alert recovering = one trigger event. ' +
          'Ongoing (unchanged) alerts produce no events. ' +
          'Only fires for lifecycle rule types (autoRecoverAlerts: true).',
      }
    ),
    examples: [
      i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.documentation.example1', {
        defaultMessage: `## React to new alerts from rules tagged "k8s"
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.alert.status: "active" and event.rule.tags: "k8s"'
\`\`\``,
        values: { triggerId: AlertStatusChangedV1TriggerId },
      }),
      i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.documentation.example2', {
        defaultMessage: `## React when any alert from a specific rule recovers
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.alert.status: "recovered" and event.rule.id: "my-rule-id"'
\`\`\``,
        values: { triggerId: AlertStatusChangedV1TriggerId },
      }),
    ],
  },
  snippets: {
    condition: 'event.alert.status: "active" and event.rule.tags: "my-tag"',
  },
};
