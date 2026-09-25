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
export const AlertStatusChangedTriggerId = 'alerting.alertStatusChanged' as const;

export const alertStatusChangedEventSchema = z.object({
  engine: z.string().describe(
    i18n.translate('xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.engine', {
      defaultMessage: 'Alerting engine that produced this event: "v1" or "v2".',
    })
  ),
  rule: z
    .object({
      id: z.string().describe(
        i18n.translate('xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.id', {
          defaultMessage: 'Rule ID.',
        })
      ),
      name: z.string().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.name',
          {
            defaultMessage: 'Rule name.',
          }
        )
      ),
      spaceId: z.string().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.spaceId',
          {
            defaultMessage: 'Kibana space ID where the rule lives.',
          }
        )
      ),
      consumer: z.string().nullable().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.consumer',
          {
            defaultMessage: 'Plugin that owns this rule (e.g. "alerts", "observability"). Null for rule engines that do not expose this field.',
          }
        )
      ),
      ruleTypeId: z.string().nullable().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.ruleTypeId',
          {
            defaultMessage: 'Rule type identifier. Null for rule engines that do not expose this field.',
          }
        )
      ),
      tags: z.array(z.string()).describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.tags',
          {
            defaultMessage: 'Rule tags.',
          }
        )
      ),
      ruleCategory: z.string().nullable().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule.ruleCategory',
          {
            defaultMessage: "Rule type display name (e.g. 'Elasticsearch query'). Null for rule engines that do not expose this field.",
          }
        )
      ),
    })
    .describe(
      i18n.translate('xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.rule', {
        defaultMessage: 'Identity of the rule whose execution produced this event.',
      })
    ),
  alert: z
    .object({
      id: z.string().nullable().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert.id',
          {
            defaultMessage:
              'Alert instance ID (the key the rule type uses to identify this instance). Null for rule engines that use episode-based identity.',
          }
        )
      ),
      uuid: z.string().nullable().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert.uuid',
          {
            defaultMessage:
              'Stable UUID for this alert instance. Matches kibana.alert.uuid in the alert document. Null for rule engines that use episode-based identity.',
          }
        )
      ),
      previousStatus: z
        .string()
        .nullable()
        .describe(
          i18n.translate(
            'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert.previousStatus',
            {
              defaultMessage:
                'Alert status before this transition. Null when the alert is firing for the first time.',
            }
          )
        ),
      actionGroup: z
        .string()
        .nullable()
        .describe(
          i18n.translate(
            'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert.actionGroup',
            {
              defaultMessage:
                'Action group at time of transition. Current group for active alerts; ' +
                'last scheduled group for recovered alerts. Null if none was recorded.',
            }
          )
        ),
      start: z
        .string()
        .nullable()
        .describe(
          i18n.translate(
            'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert.start',
            {
              defaultMessage:
                'ISO-8601 timestamp when this alert instance first became active. ' +
                'Null for recovered alerts that have no start in state.',
            }
          )
        ),
      status: z.string().describe(
        i18n.translate(
          'xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert.status',
          {
            defaultMessage:
              'Alert status at time of transition: "active" when the alert fires, "recovered" when it resolves.',
          }
        )
      ),
    })
    .describe(
      i18n.translate('xpack.alertingWorkflowTriggers.triggers.alertStatusChanged.schema.alert', {
        defaultMessage: 'The individual alert instance that changed status.',
      })
    ),
});

export type AlertStatusChangedPayload = z.infer<typeof alertStatusChangedEventSchema>;

export const alertStatusChangedTriggerDefinition: CommonTriggerDefinition<
  typeof alertStatusChangedEventSchema
> = {
  id: AlertStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedEventSchema,
  title: i18n.translate('xpack.alertingWorkflowTriggers.workflowTriggers.alertStatusChanged.title', {
    defaultMessage: 'Alert status changed',
  }),
  description: i18n.translate(
    'xpack.alertingWorkflowTriggers.workflowTriggers.alertStatusChanged.description',
    {
      defaultMessage:
        'Fires once per alert instance when it becomes active or recovers. ' +
        'Ongoing alerts that have not changed status do not re-fire. ' +
        'Filter with a KQL condition to narrow by rule tags, name, consumer, or alert id.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.alertingWorkflowTriggers.workflowTriggers.alertStatusChanged.documentation.details',
      {
        defaultMessage:
          'Fires once per alert instance per genuine status transition. ' +
          'One alert becoming active = one trigger event. One alert recovering = one trigger event. ' +
          'Ongoing (unchanged) alerts produce no events. ' +
          'Only fires for lifecycle rule types (autoRecoverAlerts: true).',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.alertingWorkflowTriggers.workflowTriggers.alertStatusChanged.documentation.example1',
        {
          defaultMessage: `## React to new alerts from rules tagged "k8s"
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'alert.status: "active" and alert.previousStatus: null and rule.tags: "k8s"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.alertingWorkflowTriggers.workflowTriggers.alertStatusChanged.documentation.example2',
        {
          defaultMessage: `## React when any alert from a specific rule recovers
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'alert.status: "recovered" and rule.id: "my-rule-id"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
    ],
  },
  snippets: {
    condition: 'alert.status: "active" and rule.tags: "my-tag"',
  },
};
