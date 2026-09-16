/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InlineActionStepType } from '../types';
import type { InlineActionStepDefinition } from './types';
import { SlackChannelSelectorWrapper } from '../components/slack_channel_selector';

const EMAIL_PARAMS_TEMPLATE = `to: 
  - ""
subject: ""
message: ""
`;

// ToDo: add a channel selector to the Slack (v2) step form
const SLACK2_PARAMS_TEMPLATE = `channel: ""
text: ""
`;

const toWorkflowStepType = (connectorTypeId: string, subAction?: string): string => {
  const typeId = connectorTypeId.startsWith('.') ? connectorTypeId.slice(1) : connectorTypeId;
  return subAction ? `${typeId}.${subAction}` : typeId;
};

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
    iconType: 'mail',
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
];

const createFallbackDefinition = (id: InlineActionStepType): InlineActionStepDefinition => {
  const [baseType, ...subActionParts] = id.split('.');
  const subAction = subActionParts.length > 0 ? subActionParts.join('.') : undefined;
  const connectorTypeId = baseType.startsWith('.') ? baseType : `.${baseType}`;

  return {
    id,
    label: id,
    iconType: 'plugs',
    connectorTypeId,
    connectorTypeSubAction: subAction,
    paramsTemplate: '',
  };
};

export const getInlineActionStepDefinition = (
  id: InlineActionStepType
): InlineActionStepDefinition | undefined => {
  if (!id) {
    return undefined;
  }
  return (
    INLINE_ACTION_STEP_DEFINITIONS.find((definition) => definition.id === id) ??
    createFallbackDefinition(id)
  );
};

export const getDefaultInlineActionStepDefinition = (): InlineActionStepDefinition => {
  const defaultDefinition = INLINE_ACTION_STEP_DEFINITIONS[0];
  if (!defaultDefinition) {
    throw new Error('No inline action step definitions are registered.');
  }
  return defaultDefinition;
};

export const definitionFromConnectorType = ({
  actionTypeId,
  name,
}: {
  actionTypeId: string;
  name: string;
}): InlineActionStepDefinition => {
  const known = INLINE_ACTION_STEP_DEFINITIONS.find(
    (definition) => definition.connectorTypeId === actionTypeId
  );
  if (known) {
    return known;
  }

  const id = toWorkflowStepType(actionTypeId);
  return {
    id,
    label: name,
    iconType: 'plugs',
    connectorTypeId: actionTypeId,
    paramsTemplate: '',
  };
};
