/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  CONNECTOR_ID as SLACK_CONNECTOR_ID,
  CONNECTOR_NAME as SLACK_CONNECTOR_NAME,
} from '@kbn/connector-schemas/slack/constants';
import { CONNECTOR_ID as SLACK_API_CONNECTOR_ID } from '@kbn/connector-schemas/slack_api/constants';
import type { PostMessageParams } from '@kbn/connector-schemas/slack_api';
import type { SlackActionParams, SlackSecrets } from '../types';

export const subtype = [
  {
    id: SLACK_CONNECTOR_ID,
    name: i18n.translate('xpack.stackConnectors.components.slack.webhook', {
      defaultMessage: 'Webhook',
    }),
  },
  {
    id: SLACK_API_CONNECTOR_ID,
    name: i18n.translate('xpack.stackConnectors.components.slack.webApi', {
      defaultMessage: 'Web API',
    }),
  },
];

export function getConnectorType(): ConnectorTypeModel<unknown, SlackSecrets, SlackActionParams> {
  return {
    id: SLACK_CONNECTOR_ID,
    subtype,
    modalWidth: 675,
    iconClass: 'logoSlack',
    selectMessage: i18n.translate('xpack.stackConnectors.components.slack.selectMessageText', {
      defaultMessage: 'Send messages to Slack channels.',
    }),
    actionTypeTitle: SLACK_CONNECTOR_NAME,
    validateParams: async (
      actionParams: SlackActionParams
    ): Promise<GenericValidationResult<SlackActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        message: new Array<string>(),
      };
      const validationResult = { errors };
      if (!actionParams.message?.length) {
        errors.message.push(translations.MESSAGE_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./slack_connectors')),
    actionParamsFields: lazy(() => import('./slack_params')),
    convertParamsBetweenGroups: (
      params: PostMessageParams | SlackActionParams
    ): PostMessageParams | SlackActionParams | {} => {
      if ('message' in params) {
        return params;
      } else if ('subAction' in params) {
        return {
          message: (params as PostMessageParams).subActionParams.text,
        };
      }
      return {};
    },
  };
}
