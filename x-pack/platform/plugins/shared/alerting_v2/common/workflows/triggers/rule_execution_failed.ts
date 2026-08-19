/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { ID_MAX_LENGTH, MAX_DESCRIPTION_LENGTH } from '@kbn/alerting-v2-schemas';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const RuleExecutionFailedTriggerId = 'alerting.ruleExecutionFailed' as const;

/**
 * Upper bound for the error message. Reuses `MAX_DESCRIPTION_LENGTH` — the
 * canonical bound for human-readable text in alerting-v2. The failed-trigger
 * binding truncates longer messages to this length so the emitted payload
 * always satisfies the schema (the workflow engine rejects oversized payloads).
 */
export const RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH = MAX_DESCRIPTION_LENGTH;

export const ruleExecutionFailedEventSchema = z.object({
  rule: z
    .object({
      id: z
        .string()
        .max(ID_MAX_LENGTH)
        .describe(
          i18n.translate('xpack.alertingV2.triggers.ruleExecutionFailed.schema.id', {
            defaultMessage: 'Unique rule identifier.',
          })
        ),
      spaceId: z
        .string()
        .max(ID_MAX_LENGTH)
        .describe(
          i18n.translate('xpack.alertingV2.triggers.ruleExecutionFailed.schema.spaceId', {
            defaultMessage: 'Kibana space ID where the rule lives.',
          })
        ),
    })
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleExecutionFailed.schema.rule', {
        defaultMessage: 'Rule whose execution failed.',
      })
    ),
  error: z
    .string()
    .max(RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH)
    .describe(
      i18n.translate('xpack.alertingV2.triggers.ruleExecutionFailed.schema.error', {
        defaultMessage: 'Error message describing why the execution failed.',
      })
    ),
});

export type RuleExecutionFailedTriggerPayload = z.infer<typeof ruleExecutionFailedEventSchema>;

export const ruleExecutionFailedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof ruleExecutionFailedEventSchema
> = {
  id: RuleExecutionFailedTriggerId,
  stability: 'tech_preview',
  eventSchema: ruleExecutionFailedEventSchema,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleExecutionFailed.title', {
    defaultMessage: 'Alerting - Rule execution failed',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleExecutionFailed.description', {
    defaultMessage: 'Emitted when a rule execution throws and does not complete.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingV2.workflowTriggers.ruleExecutionFailed.documentation.details',
      {
        defaultMessage:
          'Emitted after a rule execution fails with an error. The payload includes event.rule (id, spaceId) and event.error.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.ruleExecutionFailed.documentation.example',
        {
          defaultMessage: `## Run for a specific rule
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.rule.id: "my-rule-id"'
\`\`\``,
          values: { triggerId: RuleExecutionFailedTriggerId },
        }
      ),
    ],
  },
  snippets: { condition: 'event.rule.id: "my-rule-id"' },
};
