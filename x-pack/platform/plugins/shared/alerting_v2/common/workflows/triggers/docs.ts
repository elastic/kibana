/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTING_V2_EXPERIMENTAL_NOTE = i18n.translate(
  'xpack.alertingVTwo.workflowTriggers.documentation.notes.experimental',
  {
    defaultMessage:
      'Available only when the experimental alerting system is enabled. If it is not enabled, these triggers do not appear in the trigger picker.',
  }
);

export const ALERTING_RULE_TRIGGER_NOTES = [
  ALERTING_V2_EXPERIMENTAL_NOTE,
  i18n.translate('xpack.alertingVTwo.workflowTriggers.rule.documentation.notes.bulk', {
    defaultMessage:
      'For bulk operations (bulk enable, bulk disable, bulk delete), one trigger event is emitted for each affected rule.',
  }),
];

export const ALERTING_RULE_TRIGGER_EXAMPLES = [
  i18n.translate('xpack.alertingVTwo.workflowTriggers.rule.documentation.example.useFields', {
    defaultMessage: `## Use rule fields in a step
\`\`\`yaml
- name: log_rule_event
  type: console
  with:
    message: |
      Rule {ruleId} changed in space {spaceId}.
\`\`\``,
    values: {
      ruleId: '{{ event.rule.ruleId }}',
      spaceId: '{{ event.rule.spaceId }}',
    },
  }),
];

export const ALERTING_EPISODE_TRIGGER_NOTES = [
  i18n.translate('xpack.alertingVTwo.workflowTriggers.episode.documentation.notes.external', {
    defaultMessage:
      'Available only when the experimental alerting system is enabled. These triggers are not configured through a triggers block in workflow YAML; the alerting system attaches the workflow to the matching trigger type.',
  }),
];

export const ALERTING_EPISODE_TRIGGER_EXAMPLES = [
  i18n.translate('xpack.alertingVTwo.workflowTriggers.episode.documentation.example', {
    defaultMessage: `## Use episode fields in a step
\`\`\`yaml
- name: log
  type: console
  with:
    message: |
      Episode {episodeId} from rule {ruleId} changed state.
\`\`\``,
    values: {
      episodeId: '{{ event.episodeId }}',
      ruleId: '{{ event.ruleId }}',
    },
  }),
];
