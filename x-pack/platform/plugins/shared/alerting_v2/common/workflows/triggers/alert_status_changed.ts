/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  ALERT_EPISODE_STATUS,
  ID_MAX_LENGTH,
  MAX_NAME_LENGTH,
  tagsSchema,
} from '@kbn/alerting-v2-schemas';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/**
 * Fires once per alert status change, for alerts produced by rule runs and for alerts
 * written through the alert events client (external imports, significant events).
 */
export const AlertStatusChangedTriggerId = 'alerting.alertStatusChanged' as const;

const alertStatusSchema = lazySchema(() =>
  z.enum([
    ALERT_EPISODE_STATUS.INACTIVE,
    ALERT_EPISODE_STATUS.PENDING,
    ALERT_EPISODE_STATUS.ACTIVE,
    ALERT_EPISODE_STATUS.RECOVERING,
  ])
);

export const alertStatusChangedEventSchema = lazySchema(() =>
  z
    .object({
      spaceId: z
        .string()
        .max(ID_MAX_LENGTH)
        .describe(
          i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.spaceId', {
            defaultMessage: 'Kibana space the alert lives in.',
          })
        ),
      source: z
        .string()
        .max(ID_MAX_LENGTH)
        .describe(
          i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.source', {
            defaultMessage:
              'Where the alert came from: "internal" for alerts produced by rule runs, otherwise the source given by the writer, for example "elastic.significant_events" or the external system of an imported alert.',
          })
        ),
      alert: z
        .object({
          id: z
            .string()
            .max(ID_MAX_LENGTH)
            .describe(
              i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert.id', {
                defaultMessage: 'Identifier of the alert whose status changed.',
              })
            ),
          groupHash: z
            .string()
            .max(ID_MAX_LENGTH)
            .describe(
              i18n.translate(
                'xpack.alertingV2.triggers.alertStatusChanged.schema.alert.groupHash',
                {
                  defaultMessage:
                    'Stable hash of the alert series. A series opens a new alert each time it becomes active again after being inactive.',
                }
              )
            ),
          status: alertStatusSchema.describe(
            i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert.status', {
              defaultMessage: 'Status of the alert after the change.',
            })
          ),
          previousStatus: alertStatusSchema.nullable().describe(
            i18n.translate(
              'xpack.alertingV2.triggers.alertStatusChanged.schema.alert.previousStatus',
              {
                defaultMessage:
                  'Last status of the series before the change, or null for the first event of a series. It is "inactive" when the series opens a new alert after its previous one ended.',
              }
            )
          ),
        })
        .strict()
        .describe(
          i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert', {
            defaultMessage: 'Alert whose status changed.',
          })
        ),
      rule: z
        .object({
          id: z
            .string()
            .max(ID_MAX_LENGTH)
            .describe(
              i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.id', {
                defaultMessage: 'Unique rule identifier.',
              })
            ),
          name: z
            .string()
            .max(MAX_NAME_LENGTH)
            .describe(
              i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.name', {
                defaultMessage: 'Rule name.',
              })
            ),
          tags: tagsSchema.describe(
            i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.tags', {
              defaultMessage: 'Rule tags.',
            })
          ),
        })
        .strict()
        .nullable()
        .describe(
          i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule', {
            defaultMessage:
              'Rule that produced the alert, or null for alerts written through the alert events client, which have no rule.',
          })
        ),
      execution: z
        .object({
          executionId: z
            .string()
            .max(ID_MAX_LENGTH)
            .describe(
              i18n.translate(
                'xpack.alertingV2.triggers.alertStatusChanged.schema.execution.executionId',
                {
                  defaultMessage: "Task Manager's execution UUID for the rule run.",
                }
              )
            ),
          scheduledAt: z
            .string()
            .max(ID_MAX_LENGTH)
            .describe(
              i18n.translate(
                'xpack.alertingV2.triggers.alertStatusChanged.schema.execution.scheduledAt',
                {
                  defaultMessage:
                    'Scheduled run timestamp. Equals `scheduled_timestamp` on the `.rule-events` documents the run produced.',
                }
              )
            ),
        })
        .strict()
        .nullable()
        .describe(
          i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.execution', {
            defaultMessage:
              'Rule run that changed the status, or null for alerts written through the alert events client.',
          })
        ),
    })
    .strict()
);

export type AlertStatusChangedTriggerPayload = z.infer<typeof alertStatusChangedEventSchema>;

export const alertStatusChangedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertStatusChangedEventSchema
> = {
  id: AlertStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedEventSchema,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.alertStatusChanged.title', {
    defaultMessage: 'Alerting - Alert status changed',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.alertStatusChanged.description', {
    defaultMessage:
      'Fires once per alert each time its status changes. Technical preview: events are only sent after an integration, for example Nightshift, has opted in.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.details',
      {
        defaultMessage:
          'Fires once per alert per genuine status change between pending, active, recovering and inactive. Alerts whose status did not change produce no events. ' +
          'It fires for alerts produced by rule runs and for alerts written through the alert events client, such as imported external alerts and significant events. ' +
          'For the latter, event.rule and event.execution are null, and event.source always says where the alert came from. ' +
          'Alerts a user has manually activated produce no events while they are held active. ' +
          'Events are only published after an integration, for example Nightshift, has opted in, and only for the spaces it enables. Until then no events are sent. ' +
          'Workflows started from a rule run use the API key of the rule, and workflows started from an alert events client write use the request of the writer, not the workflow author. Anyone who can create workflows in the space can subscribe to this trigger. ' +
          'Rule names, tags, and ids from each event are also written to the workflow trigger log, which users with workflow execution read access in the space can view.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.example1',
        {
          defaultMessage: `## React when an alert becomes active, except when it flaps back from recovering
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.alert.status: "active" and not event.alert.previousStatus: "recovering"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.example2',
        {
          defaultMessage: `## React when an alert from rules tagged "k8s" becomes inactive
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.alert.status: "inactive" and event.rule.tags: "k8s"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.example3',
        {
          defaultMessage: `## React to imported alerts from one external source
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.source: "datadog" and event.alert.status: "active"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
    ],
  },
  snippets: { condition: 'event.alert.status: "active"' },
};
