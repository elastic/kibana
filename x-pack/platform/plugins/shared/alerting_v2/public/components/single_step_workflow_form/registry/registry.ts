/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SingleStepWorkflowTypeId } from '../types';
import type { SingleStepWorkflowType } from './types';

const EMAIL_PARAMS_TEMPLATE = `to: ""
subject: ""
message: ""
`;

const SLACK_PARAMS_TEMPLATE = `message: ""
`;

export const SINGLE_STEP_WORKFLOW_TYPES: readonly SingleStepWorkflowType[] = [
  {
    id: 'email',
    label: i18n.translate('xpack.alertingV2.singleStepWorkflow.type.email.label', {
      defaultMessage: 'Email',
    }),
    description: i18n.translate('xpack.alertingV2.singleStepWorkflow.type.email.description', {
      defaultMessage: 'Send an email when this policy dispatches an active alert episode.',
    }),
    iconType: 'email',
    connectorTypeId: '.email',
    paramsTemplate: EMAIL_PARAMS_TEMPLATE,
  },
  {
    id: 'slack',
    label: i18n.translate('xpack.alertingV2.singleStepWorkflow.type.slack.label', {
      defaultMessage: 'Slack',
    }),
    description: i18n.translate('xpack.alertingV2.singleStepWorkflow.type.slack.description', {
      defaultMessage: 'Post a Slack message when this policy dispatches an active alert episode.',
    }),
    iconType: 'logoSlack',
    connectorTypeId: '.slack',
    paramsTemplate: SLACK_PARAMS_TEMPLATE,
  },
];

export const getSingleStepWorkflowType = (
  id: SingleStepWorkflowTypeId
): SingleStepWorkflowType | undefined => SINGLE_STEP_WORKFLOW_TYPES.find((type) => type.id === id);

export const getDefaultSingleStepWorkflowType = (): SingleStepWorkflowType =>
  SINGLE_STEP_WORKFLOW_TYPES[0];
