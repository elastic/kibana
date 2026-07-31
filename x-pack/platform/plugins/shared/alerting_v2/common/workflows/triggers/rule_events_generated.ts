/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { ID_MAX_LENGTH, ruleKindSchema, tagsSchema } from '@kbn/alerting-v2-schemas';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/**
 * Fires when a rule execution succeeds AND persists at least one rule event.
 *
 * Named for what it delivers (rule events to process) rather than for the
 * underlying `rule.execution.succeeded` domain event: successful runs that
 * produced zero rule events are intentionally not surfaced here (there is
 * nothing for a consumer to fetch from `.rule-events`).
 */
export const RuleEventsGeneratedTriggerId = 'alerting.ruleEventsGenerated' as const;

/**
 * Rule identity carried on the trigger. `id`/`spaceId` to
 * locate the rule, plus the two fields workflow authors need to route by
 * origin: `kind` (whether the rule emits signals or alerts) and `tags` (e.g.
 * `["security", "o11y"]`).
 *
 * Field shapes reuse the canonical alerting-v2 schemas (`ID_MAX_LENGTH`,
 * `ruleKindSchema`, `tagsSchema`) so this trigger stays in lockstep with what
 * the rule schemas actually persist.
 */
export const ruleEventsGeneratedRuleSchema = z.object({
  id: z
    .string()
    .max(ID_MAX_LENGTH)
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.id', {
        defaultMessage: 'Unique rule identifier.',
      })
    ),
  spaceId: z
    .string()
    .max(ID_MAX_LENGTH)
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.spaceId', {
        defaultMessage: 'Kibana space ID where the rule lives.',
      })
    ),
  kind: ruleKindSchema.describe(
    i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.kind', {
      defaultMessage:
        'Rule kind: "alert" for stateful alerting with transitions, "signal" for stateless detection.',
    })
  ),
  tags: tagsSchema.describe(
    i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.tags', {
      defaultMessage: 'Rule tags.',
    })
  ),
});

export const ruleEventsGeneratedEventSchema = z.object({
  rule: ruleEventsGeneratedRuleSchema.describe(
    i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.rule', {
      defaultMessage: 'Rule whose execution produced this event.',
    })
  ),
  execution: z
    .object({
      executionId: z.string().describe(
        i18n.translate(
          'xpack.alertingV2.triggers.ruleEventsGenerated.schema.execution.executionId',
          {
            defaultMessage: "Task Manager's execution UUID for this run.",
          }
        )
      ),
      scheduledAt: z.string().describe(
        i18n.translate(
          'xpack.alertingV2.triggers.ruleEventsGenerated.schema.execution.scheduledAt',
          {
            defaultMessage:
              'Scheduled run timestamp. Equals `scheduled_timestamp` on the `.rule-events` documents this run produced.',
          }
        )
      ),
    })
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.execution', {
        defaultMessage: 'Execution identity and correlation keys for this run.',
      })
    ),
  ruleEventsGenerated: z
    .number()
    .int()
    .min(1)
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleEventsGenerated.schema.ruleEventsGenerated', {
        defaultMessage:
          'Number of rule events persisted to `.rule-events` by this run. Always greater than zero for this trigger.',
      })
    ),
});

export type RuleEventsGeneratedTriggerPayload = z.infer<typeof ruleEventsGeneratedEventSchema>;

export const ruleEventsGeneratedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof ruleEventsGeneratedEventSchema
> = {
  id: RuleEventsGeneratedTriggerId,
  stability: 'tech_preview',
  eventSchema: ruleEventsGeneratedEventSchema,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleEventsGenerated.title', {
    defaultMessage: 'Alerting - Rule generated rule events',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleEventsGenerated.description', {
    defaultMessage:
      'Emitted when a rule execution completes successfully and produces at least one rule event.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingV2.workflowTriggers.ruleEventsGenerated.documentation.details',
      {
        defaultMessage:
          'Emitted after a successful run that persisted one or more rule events. It does not fire for successful runs that produced no rule events. The payload includes event.rule (id, spaceId, kind, tags), event.execution (executionId, scheduledAt) and event.ruleEventsGenerated. Query `.rule-events` where scheduled_timestamp equals event.execution.scheduledAt to fetch the events this run produced.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.ruleEventsGenerated.documentation.example',
        {
          defaultMessage: `## Run only for signal rules tagged "security"
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.rule.kind: "signal" and event.rule.tags: "security"'
\`\`\``,
          values: { triggerId: RuleEventsGeneratedTriggerId },
        }
      ),
    ],
  },
  snippets: { condition: 'event.rule.kind: "signal"' },
};
