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
 * rule produces a new alert, or when an alert recovers. Ongoing alerts that have
 * not changed state do NOT re-fire — use `on.condition` to filter by alert or
 * rule properties without incurring per-execution costs.
 *
 * Scoped to lifecycle rule types (autoRecoverAlerts: true). Non-lifecycle rules
 * (e.g. security persistence rules) do not emit this trigger because their alert
 * state is not persisted between runs, making "new" vs "ongoing" indeterminate.
 */
export const AlertStateChangedTriggerId = 'alerting.alertStateChanged' as const;

export const alertStateChangedEventSchema = z.object({
  rule: z
    .object({
      id: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.id', {
          defaultMessage: 'Rule ID.',
        })
      ),
      name: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.name', {
          defaultMessage: 'Rule name.',
        })
      ),
      spaceId: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.spaceId', {
          defaultMessage: 'Kibana space ID where the rule lives.',
        })
      ),
      consumer: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.consumer', {
          defaultMessage: 'Plugin that owns this rule (e.g. "alerts", "observability").',
        })
      ),
      ruleTypeId: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.ruleTypeId', {
          defaultMessage: 'Rule type identifier.',
        })
      ),
      tags: z.array(z.string()).describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.tags', {
          defaultMessage: 'Rule tags.',
        })
      ),
      ruleCategory: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule.ruleCategory', {
          defaultMessage: "Rule type display name (e.g. 'Elasticsearch query').",
        })
      ),
    })
    .describe(
      i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.rule', {
        defaultMessage: 'Identity of the rule whose execution produced this event.',
      })
    ),
  alert: z
    .object({
      id: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert.id', {
          defaultMessage: 'Alert instance ID (the key the rule type uses to identify this instance).',
        })
      ),
      uuid: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert.uuid', {
          defaultMessage:
            'Stable UUID for this alert instance. Matches kibana.alert.uuid in the alert document.',
        })
      ),
      category: z.enum(['new', 'recovered']).describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert.category', {
          defaultMessage:
            '"new" = alert transitioned to active for the first time this run. ' +
            '"recovered" = alert transitioned from active to resolved.',
        })
      ),
      actionGroup: z.string().nullable().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert.actionGroup', {
          defaultMessage:
            'Action group at time of transition. Current group for new alerts; ' +
            'last scheduled group for recovered alerts. Null if none was recorded.',
        })
      ),
      start: z.string().nullable().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert.start', {
          defaultMessage:
            'ISO-8601 timestamp when this alert instance first became active. ' +
            'Null for recovered alerts that have no start in state.',
        })
      ),
      status: z.string().describe(
        i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert.status', {
          defaultMessage:
            'Alert status at time of transition: "active" for new alerts, "recovered" for resolved.',
        })
      ),
    })
    .describe(
      i18n.translate('xpack.alerting.triggers.alertStateChanged.schema.alert', {
        defaultMessage: 'The individual alert instance that changed state.',
      })
    ),
});

export type AlertStateChangedPayload = z.infer<typeof alertStateChangedEventSchema>;

export const alertStateChangedTriggerDefinition: CommonTriggerDefinition<
  typeof alertStateChangedEventSchema
> = {
  id: AlertStateChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStateChangedEventSchema,
  title: i18n.translate('xpack.alerting.workflowTriggers.alertStateChanged.title', {
    defaultMessage: 'Alert state changed',
  }),
  description: i18n.translate('xpack.alerting.workflowTriggers.alertStateChanged.description', {
    defaultMessage:
      'Fires once per alert instance when it becomes active (new) or resolves (recovered). ' +
      'Ongoing alerts that have not changed state do not re-fire. ' +
      'Filter with a KQL condition to narrow by rule tags, name, consumer, or alert id.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alerting.workflowTriggers.alertStateChanged.documentation.details',
      {
        defaultMessage:
          'Fires once per alert instance per genuine state transition. ' +
          'One alert becoming active = one trigger event. One alert recovering = one trigger event. ' +
          'Ongoing (unchanged) alerts produce no events. ' +
          'Only fires for lifecycle rule types (autoRecoverAlerts: true).',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.alerting.workflowTriggers.alertStateChanged.documentation.example1',
        {
          defaultMessage: `## React to new alerts from rules tagged "k8s"
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'alert.category: "new" and rule.tags: "k8s"'
\`\`\``,
          values: { triggerId: AlertStateChangedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.alerting.workflowTriggers.alertStateChanged.documentation.example2',
        {
          defaultMessage: `## React when any alert from a specific rule recovers
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'alert.category: "recovered" and rule.id: "my-rule-id"'
\`\`\``,
          values: { triggerId: AlertStateChangedTriggerId },
        }
      ),
    ],
  },
  snippets: {
    condition: 'alert.category: "new" and rule.tags: "my-tag"',
  },
};
