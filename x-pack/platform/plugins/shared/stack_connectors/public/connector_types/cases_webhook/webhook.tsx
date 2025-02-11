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
} from '@kbn/triggers-actions-ui-plugin/public';
import { CasesWebhookActionParams, CasesWebhookConfig, CasesWebhookSecrets } from './types';

export function getConnectorType(): ConnectorTypeModel<
  CasesWebhookConfig,
  CasesWebhookSecrets,
  CasesWebhookActionParams
> {
  return {
    id: '.cases-webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.stackConnectors.components.casesWebhook.selectMessageText',
      {
        defaultMessage: 'Send a request to a Case Management web service.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.casesWebhookxpack.stackConnectors.components.casesWebhook.connectorTypeTitle',
      {
        defaultMessage: 'Webhook - Case Management data',
      }
    ),
    validateParams: async (
      actionParams: CasesWebhookActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.title': new Array<string>(),
      };
      const validationResult = { errors };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.title?.length
      ) {
        errors['subActionParams.incident.title'].push(translations.SUMMARY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./webhook_connectors')),
    actionParamsFields: lazy(() => import('./webhook_params')),
  };
}
