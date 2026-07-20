/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InlineActionStepType } from '../types';
import type { InlineActionStepDefinition } from './types';

const EMAIL_PARAMS_TEMPLATE = `to: ""
subject: ""
message: ""
`;

// ToDo: add a channel selector to the Slack (v2) step form
const SLACK2_PARAMS_TEMPLATE = `channel: ""
text: ""
`;

export const INLINE_ACTION_STEP_DEFINITIONS: readonly InlineActionStepDefinition[] = [
  {
    id: 'email',
    label: i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.stepType.email.label', {
      defaultMessage: 'Email',
    }),
    description: i18n.translate(
      'xpack.responseOps.alertingV2RuleForm.actionForm.stepType.email.description',
      {
        defaultMessage: 'Send an email',
      }
    ),
    iconType: 'email',
    connectorTypeId: '.email',
    paramsTemplate: EMAIL_PARAMS_TEMPLATE,
  },
  {
    id: 'slack2.sendMessage',
    label: i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.stepType.slack2.label', {
      defaultMessage: 'Slack',
    }),
    description: i18n.translate(
      'xpack.responseOps.alertingV2RuleForm.actionForm.stepType.slack2.description',
      {
        defaultMessage: 'Post a Slack message',
      }
    ),
    iconType: 'logoSlack',
    connectorTypeId: '.slack2',
    connectorTypeSubAction: 'sendMessage',
    paramsTemplate: SLACK2_PARAMS_TEMPLATE,
  },
];

export const getInlineActionStepDefinition = (
  id: InlineActionStepType
): InlineActionStepDefinition | undefined =>
  INLINE_ACTION_STEP_DEFINITIONS.find((definition) => definition.id === id);

export const getDefaultInlineActionStepDefinition = (): InlineActionStepDefinition => {
  const defaultDefinition = INLINE_ACTION_STEP_DEFINITIONS[0];
  if (!defaultDefinition) {
    throw new Error('No inline action step definitions are registered.');
  }
  return defaultDefinition;
};
