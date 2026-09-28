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
 * Fires once per alert (episode) per genuine status transition produced by a
 * rule execution. User-initiated status changes (activate / deactivate) are
 * NOT included — those are separate triggers in the alerting.userActions.*
 * namespace.
 *
 * Emitted by the rule-executor event pipeline after a successful run. Halted
 * and failed runs do NOT produce this event.
 */
export const AlertStatusChangedTriggerId = 'alerting.alertStatusChanged' as const;

/** v2 alert episode statuses that appear in this trigger. */
const alertEpisodeStatusSchema = z.enum(['pending', 'active', 'recovering', 'inactive']);

export const alertStatusChangedEventSchema = z.object({
  rule: z
    .object({
      id: z.string().describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.id', {
          defaultMessage: 'Rule ID.',
        })
      ),
      name: z.string().describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.name', {
          defaultMessage: 'Rule name.',
        })
      ),
      spaceId: z.string().describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.spaceId', {
          defaultMessage: 'Kibana space ID where the rule lives.',
        })
      ),
      tags: z.array(z.string()).describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule.tags', {
          defaultMessage: 'Rule tags.',
        })
      ),
    })
    .describe(
      i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.rule', {
        defaultMessage: 'Identity of the rule whose execution produced this event.',
      })
    ),
  alert: z
    .object({
      groupHash: z.string().describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert.groupHash', {
          defaultMessage:
            'The group hash that identifies this alert episode across rule executions.',
        })
      ),
      episodeId: z.string().describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert.episodeId', {
          defaultMessage:
            'The episode ID for this run. A new ID is assigned when a previously inactive alert re-activates.',
        })
      ),
      source: z.string().describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert.source', {
          defaultMessage:
            'Source identifier for this alert (e.g. "nightshift", "significant_event"). Useful for filtering automations to alerts from a specific pipeline.',
        })
      ),
      status: alertEpisodeStatusSchema.describe(
        i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert.status', {
          defaultMessage:
            'Alert status after this transition: "pending", "active", "recovering", or "inactive".',
        })
      ),
      previousStatus: alertEpisodeStatusSchema
        .nullable()
        .describe(
          i18n.translate(
            'xpack.alertingV2.triggers.alertStatusChanged.schema.alert.previousStatus',
            {
              defaultMessage:
                'Alert status before this transition. Null when the alert is firing for the first time (no prior episode state in this run).',
            }
          )
        ),
    })
    .describe(
      i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.alert', {
        defaultMessage: 'The individual alert episode that changed status.',
      })
    ),
  execution: z
    .object({
      executionId: z.string().describe(
        i18n.translate(
          'xpack.alertingV2.triggers.alertStatusChanged.schema.execution.executionId',
          { defaultMessage: 'Execution ID for this rule run.' }
        )
      ),
      scheduledAt: z.string().describe(
        i18n.translate(
          'xpack.alertingV2.triggers.alertStatusChanged.schema.execution.scheduledAt',
          {
            defaultMessage:
              'ISO-8601 timestamp when this execution was scheduled. Use this to correlate with `.rule-events`.',
          }
        )
      ),
    })
    .describe(
      i18n.translate('xpack.alertingV2.triggers.alertStatusChanged.schema.execution', {
        defaultMessage: 'Execution context for this event.',
      })
    ),
});

export type AlertStatusChangedPayload = z.infer<typeof alertStatusChangedEventSchema>;

export const alertStatusChangedCommonDefinition: CommonTriggerDefinition<
  typeof alertStatusChangedEventSchema
> = {
  id: AlertStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedEventSchema,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.alertStatusChanged.title', {
    defaultMessage: 'Alert status changed',
  }),
  description: i18n.translate(
    'xpack.alertingV2.workflowTriggers.alertStatusChanged.description',
    {
      defaultMessage:
        'Fires once per alert episode when its status changes during a rule execution. ' +
        'Use alert.previousStatus to distinguish new activations from flaps.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.details',
      {
        defaultMessage:
          'Fires once per alert episode per genuine status transition produced by a rule execution. ' +
          'Halted and failed runs do NOT produce events. ' +
          'User-initiated activations and deactivations are separate triggers.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.example1',
        {
          defaultMessage: `## React when an alert first becomes active (not a flap)
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'alert.status: "active" AND NOT alert.previousStatus: "recovering" AND rule.tags: "k8s"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.alertStatusChanged.documentation.example2',
        {
          defaultMessage: `## React when a specific alert recovers
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'alert.status: "inactive" AND rule.id: "my-rule-id"'
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
