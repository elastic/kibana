/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ALERTING_RULE_TRIGGER_EXAMPLES, ALERTING_RULE_TRIGGER_NOTES } from './docs';
import { ruleLifecycleEventSchema } from './schemas';

export const RuleUpdatedTriggerId = 'alerting.ruleUpdated' as const;

export const ruleUpdatedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof ruleLifecycleEventSchema
> = {
  id: RuleUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: ruleLifecycleEventSchema,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleUpdated.title', {
    defaultMessage: 'Alerting - Rule updated',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleUpdated.description', {
    defaultMessage: 'Emitted when an alerting rule is updated.',
  }),
  documentation: {
    notes: [
      ...ALERTING_RULE_TRIGGER_NOTES,
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.ruleUpdated.documentation.notes.subscribe',
        {
          defaultMessage:
            'When enabled state changes through the dedicated enable or disable action, alerting.ruleEnabled or alerting.ruleDisabled is also emitted. Subscribe to this trigger for configuration updates, or to the enable/disable triggers for state changes only.',
        }
      ),
    ],
    details: i18n.translate('xpack.alertingV2.workflowTriggers.ruleUpdated.documentation.details', {
      defaultMessage:
        "Emitted after a rule's configuration is changed using a PATCH or PUT update. Enabling or disabling a rule through the dedicated enable or disable action does not emit this trigger; it emits alerting.ruleEnabled or alerting.ruleDisabled instead. The payload includes event.rule with ruleId, spaceId, and tags.",
    }),
    examples: [
      ...ALERTING_RULE_TRIGGER_EXAMPLES,
      i18n.translate('xpack.alertingV2.workflowTriggers.ruleUpdated.documentation.example', {
        defaultMessage: `## Run for a specific rule
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.rule.ruleId: "my-rule-id"'
\`\`\``,
        values: { triggerId: RuleUpdatedTriggerId },
      }),
      i18n.translate(
        'xpack.alertingV2.workflowTriggers.ruleUpdated.documentation.tagConditionExample',
        {
          defaultMessage: `## Run for rules with a tag
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.rule.tags: "critical"'
\`\`\``,
          values: { triggerId: RuleUpdatedTriggerId },
        }
      ),
    ],
  },
  snippets: { condition: 'event.rule.tags: "my-tag"' },
};
