/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ruleLifecycleEventSchema } from './schemas';

export const RuleCreatedTriggerId = 'alerting.ruleCreated' as const;
export const RuleUpdatedTriggerId = 'alerting.ruleUpdated' as const;
export const RuleDeletedTriggerId = 'alerting.ruleDeleted' as const;
export const RuleEnabledTriggerId = 'alerting.ruleEnabled' as const;
export const RuleDisabledTriggerId = 'alerting.ruleDisabled' as const;

const ruleKindFilterSnippet = 'event.rule.kind: "alert"';

const createRuleTriggerDefinition = ({
  id,
  title,
  description,
  documentationDetails,
  exampleCondition,
}: {
  id: string;
  title: string;
  description: string;
  documentationDetails: string;
  exampleCondition: string;
}): CommonTriggerDefinition<typeof ruleLifecycleEventSchema> => ({
  id,
  eventSchema: ruleLifecycleEventSchema,
  title,
  description,
  documentation: {
    details: documentationDetails,
    examples: [
      i18n.translate('xpack.alertingV2.workflowTriggers.rule.documentation.example', {
        defaultMessage: `## Filter by rule kind
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: '{condition}'
\`\`\``,
        values: { triggerId: id, condition: exampleCondition },
      }),
    ],
  },
  snippets: { condition: exampleCondition },
});

export const ruleCreatedTriggerCommonDefinition = createRuleTriggerDefinition({
  id: RuleCreatedTriggerId,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleCreated.title', {
    defaultMessage: 'Alerting - Rule created',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleCreated.description', {
    defaultMessage: 'Emitted when an alerting rule is created.',
  }),
  documentationDetails: i18n.translate(
    'xpack.alertingV2.workflowTriggers.ruleCreated.documentation.details',
    {
      defaultMessage:
        'Emitted after rule creation. The payload includes event.rule with ruleId, spaceId, name, kind, query, and enabled. Use KQL on event.rule.* for trigger conditions.',
    }
  ),
  exampleCondition: ruleKindFilterSnippet,
});

export const ruleUpdatedTriggerCommonDefinition = createRuleTriggerDefinition({
  id: RuleUpdatedTriggerId,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleUpdated.title', {
    defaultMessage: 'Alerting - Rule updated',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleUpdated.description', {
    defaultMessage: 'Emitted when an alerting rule is updated.',
  }),
  documentationDetails: i18n.translate(
    'xpack.alertingV2.workflowTriggers.ruleUpdated.documentation.details',
    {
      defaultMessage:
        'Emitted after any rule update via PATCH. When enabled state changes, ruleEnabled or ruleDisabled is also emitted. Subscribe to this trigger for all updates, or to the enable/disable triggers for state changes only.',
    }
  ),
  exampleCondition: ruleKindFilterSnippet,
});

export const ruleDeletedTriggerCommonDefinition = createRuleTriggerDefinition({
  id: RuleDeletedTriggerId,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleDeleted.title', {
    defaultMessage: 'Alerting - Rule deleted',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleDeleted.description', {
    defaultMessage: 'Emitted when an alerting rule is deleted.',
  }),
  documentationDetails: i18n.translate(
    'xpack.alertingV2.workflowTriggers.ruleDeleted.documentation.details',
    {
      defaultMessage:
        'Emitted after rule deletion with a snapshot of the deleted rule in event.rule. Bulk deletes emit one event per successfully deleted rule.',
    }
  ),
  exampleCondition: ruleKindFilterSnippet,
});

export const ruleEnabledTriggerCommonDefinition = createRuleTriggerDefinition({
  id: RuleEnabledTriggerId,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleEnabled.title', {
    defaultMessage: 'Alerting - Rule enabled',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleEnabled.description', {
    defaultMessage: 'Emitted when an alerting rule is enabled.',
  }),
  documentationDetails: i18n.translate(
    'xpack.alertingV2.workflowTriggers.ruleEnabled.documentation.details',
    {
      defaultMessage:
        'Emitted when a rule transitions to enabled. Bulk enable emits one event per successfully enabled rule.',
    }
  ),
  exampleCondition: 'event.rule.enabled: true',
});

export const ruleDisabledTriggerCommonDefinition = createRuleTriggerDefinition({
  id: RuleDisabledTriggerId,
  title: i18n.translate('xpack.alertingV2.workflowTriggers.ruleDisabled.title', {
    defaultMessage: 'Alerting - Rule disabled',
  }),
  description: i18n.translate('xpack.alertingV2.workflowTriggers.ruleDisabled.description', {
    defaultMessage: 'Emitted when an alerting rule is disabled.',
  }),
  documentationDetails: i18n.translate(
    'xpack.alertingV2.workflowTriggers.ruleDisabled.documentation.details',
    {
      defaultMessage:
        'Emitted when a rule transitions to disabled. Bulk disable emits one event per successfully disabled rule.',
    }
  ),
  exampleCondition: 'event.rule.enabled: false',
});
