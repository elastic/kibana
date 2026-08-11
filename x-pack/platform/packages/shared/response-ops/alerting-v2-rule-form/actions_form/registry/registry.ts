/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InlineActionStepType } from '../types';
import type { InlineActionStepDefinition } from './types';
import {
  ElasticSlackChannelSelectorWrapper,
  SlackChannelSelectorWrapper,
} from '../components/slack_channel_selector';

const EMAIL_PARAMS_TEMPLATE = `to: 
  - ""
subject: ""
message: ""
`;

// ToDo: add a channel selector to the Slack (v2) step form
const SLACK2_PARAMS_TEMPLATE = `channel: ""
text: ""
`;

const ELASTIC_SLACK_PARAMS_TEMPLATE = `channel: ""
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
    CustomComponent: SlackChannelSelectorWrapper,
  },
  {
    id: 'elastic_slack.sendMessage',
    label: i18n.translate(
      'xpack.responseOps.alertingV2RuleForm.actionForm.stepType.elasticSlack.label',
      { defaultMessage: 'Slack (Elastic app)' }
    ),
    description: i18n.translate(
      'xpack.responseOps.alertingV2RuleForm.actionForm.stepType.elasticSlack.description',
      {
        defaultMessage: 'Post a Slack message to a connected channel',
      }
    ),
    iconType: 'logoSlack',
    connectorTypeId: '.elastic_slack',
    connectorTypeSubAction: 'sendMessage',
    paramsTemplate: ELASTIC_SLACK_PARAMS_TEMPLATE,
    CustomComponent: ElasticSlackChannelSelectorWrapper,
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
