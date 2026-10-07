/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID } from './alert_status_changed_setting';

/**
 * Fires once per alert instance per genuine status change: when a rule produces a new
 * active alert, or when an alert recovers.
 *
 * Ongoing alerts that have not changed status do NOT re-fire.
 * Only rules whose alerts recover automatically (autoRecoverAlerts === true) fire it.
 */
export const AlertStatusChangedTriggerId = 'alerting.v1.alertStatusChanged' as const;

export const alertStatusChangedV1EventSchema = z
  .object({
    rule: z
      .object({
        id: z.string().describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.id', {
            defaultMessage: 'Rule ID.',
          })
        ),
        name: z.string().describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.name', {
            defaultMessage: 'Rule name.',
          })
        ),
        spaceId: z.string().describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.spaceId', {
            defaultMessage: 'Kibana space ID where the rule lives.',
          })
        ),
        consumer: z.string().describe(
          i18n.translate(
            'xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.consumer',
            {
              defaultMessage: 'Plugin that owns this rule (e.g. "alerts", "observability").',
            }
          )
        ),
        ruleTypeId: z.string().describe(
          i18n.translate(
            'xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.ruleTypeId',
            {
              defaultMessage:
                'Rule type identifier. This is stable, so use it to filter by rule type.',
            }
          )
        ),
        tags: z.array(z.string()).describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.tags', {
            defaultMessage: 'Rule tags.',
          })
        ),
        ruleTypeName: z.string().describe(
          i18n.translate(
            'xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule.ruleTypeName',
            {
              defaultMessage:
                "Display name of the rule type (e.g. 'Elasticsearch query'). It is translated to the server language, so use ruleTypeId to filter.",
            }
          )
        ),
      })
      .strict()
      .describe(
        i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.rule', {
          defaultMessage: 'Identity of the rule whose execution produced this event.',
        })
      ),
    alert: z
      .object({
        id: z.string().describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.alert.id', {
            defaultMessage:
              'Alert instance ID (the key the rule type uses to identify this instance).',
          })
        ),
        uuid: z.string().describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.alert.uuid', {
            defaultMessage:
              'Stable UUID for this alert instance. Matches kibana.alert.uuid in the alert document.',
          })
        ),
        status: z.enum(['active', 'recovered']).describe(
          i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.alert.status', {
            defaultMessage:
              'Alert status at time of change: "active" when the alert fires, "recovered" when it resolves.',
          })
        ),
        actionGroup: z
          .string()
          .nullable()
          .describe(
            i18n.translate(
              'xpack.alerting.workflowTriggers.alertStatusChanged.schema.alert.actionGroup',
              {
                defaultMessage:
                  'Action group at time of change. For active alerts this is the current group. ' +
                  'For recovered alerts it is the last scheduled group, which is only recorded when a per-alert action ran, ' +
                  'so it is often null for rules without per-alert actions. Null if none was recorded.',
              }
            )
          ),
        start: z
          .string()
          .nullable()
          .describe(
            i18n.translate(
              'xpack.alerting.workflowTriggers.alertStatusChanged.schema.alert.start',
              {
                defaultMessage:
                  'ISO-8601 timestamp when this alert instance first became active. ' +
                  'Null for recovered alerts that have no start in state.',
              }
            )
          ),
      })
      .strict()
      .describe(
        i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.schema.alert', {
          defaultMessage: 'The individual alert instance that changed status.',
        })
      ),
  })
  .strict();

export type AlertStatusChangedV1Payload = z.infer<typeof alertStatusChangedV1EventSchema>;

export const alertStatusChangedV1TriggerDefinition: CommonTriggerDefinition<
  typeof alertStatusChangedV1EventSchema
> = {
  id: AlertStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedV1EventSchema,
  title: i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.title', {
    defaultMessage: 'Alert status changed',
  }),
  description: i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.description', {
    defaultMessage:
      'Fires once per alert instance when it becomes active or recovers. ' +
      'Ongoing alerts that have not changed status do not re-fire. ' +
      'Technical preview: turn on the "Alert status workflow trigger" advanced setting in each space that uses it.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alerting.workflowTriggers.alertStatusChanged.documentation.details',
      {
        defaultMessage:
          'Fires once per alert instance per genuine status change. ' +
          'One alert becoming active is one trigger event, and one alert recovering is one trigger event. ' +
          'Alerts that have not changed status produce no events. ' +
          'Only rules whose alerts recover automatically fire this trigger. ' +
          'Events are sent for every status change, even when the rule or alert is snoozed, muted, or in a maintenance window. ' +
          'Events are only published in spaces where the "Alert status workflow trigger" ' +
          'advanced setting ({settingId}) is on. It is off by default. ' +
          'Workflows started by this trigger run with the API key of the rule that raised the alert, ' +
          'not the workflow author, and anyone who can create workflows in the space can subscribe to it. ' +
          'Rule names, tags, and ids from each event are also written to the workflow trigger log, ' +
          'which users with workflow execution read access in the space can view.',
        values: { settingId: ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID },
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
        values: { triggerId: AlertStatusChangedTriggerId },
      }),
      i18n.translate('xpack.alerting.workflowTriggers.alertStatusChanged.documentation.example2', {
        defaultMessage: `## React when any alert from a specific rule recovers
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.alert.status: "recovered" and event.rule.id: "my-rule-id"'
\`\`\``,
        values: { triggerId: AlertStatusChangedTriggerId },
      }),
    ],
  },
  snippets: {
    condition: 'event.alert.status: "active" and event.rule.tags: "my-tag"',
  },
};
