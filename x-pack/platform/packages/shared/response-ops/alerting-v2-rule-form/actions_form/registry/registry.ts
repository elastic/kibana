/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { INLINE_ACTION_STEPS } from '@kbn/alerting-v2-utils';
import type { InlineActionStepType } from '../types';
import type { InlineActionStepDefinition } from './types';
import { SlackChannelSelectorWrapper } from '../components/slack_channel_selector';

const STEP_UI: Record<
  InlineActionStepType,
  Pick<InlineActionStepDefinition, 'description' | 'iconType' | 'CustomComponent'>
> = {
  email: {
    description: i18n.translate(
      'xpack.alertingV2.alertingV2RuleForm.actionForm.stepType.email.description',
      {
        defaultMessage: 'Send an email',
      }
    ),
    iconType: 'mail',
  },
  'slack2.sendMessage': {
    description: i18n.translate(
      'xpack.alertingV2.alertingV2RuleForm.actionForm.stepType.slack2.description',
      {
        defaultMessage: 'Post a Slack message',
      }
    ),
    iconType: 'logoSlack',
    CustomComponent: SlackChannelSelectorWrapper,
  },
};

export const INLINE_ACTION_STEP_DEFINITIONS: readonly InlineActionStepDefinition[] =
  INLINE_ACTION_STEPS.map((step) => ({ ...step, ...STEP_UI[step.id] }));

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
