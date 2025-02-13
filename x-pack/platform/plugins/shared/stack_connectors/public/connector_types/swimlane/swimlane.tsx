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
import { SwimlaneConfig, SwimlaneSecrets, SwimlaneActionParams } from './types';

export const SW_SELECT_MESSAGE_TEXT = i18n.translate(
  'xpack.stackConnectors.components.swimlane.selectMessageText',
  {
    defaultMessage: 'Create record in Swimlane',
  }
);

export const SW_ACTION_TYPE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.swimlane.connectorTypeTitle',
  {
    defaultMessage: 'Create Swimlane Record',
  }
);

export function getConnectorType(): ConnectorTypeModel<
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams
> {
  return {
    id: '.swimlane',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SW_SELECT_MESSAGE_TEXT,
    actionTypeTitle: SW_ACTION_TYPE_TITLE,
    validateParams: async (
      actionParams: SwimlaneActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.ruleName': new Array<string>(),
        'subActionParams.incident.alertId': new Array<string>(),
      };
      const validationResult = {
        errors,
      };

      const hasIncident = actionParams.subActionParams && actionParams.subActionParams.incident;

      if (hasIncident && !actionParams.subActionParams.incident.ruleName?.length) {
        errors['subActionParams.incident.ruleName'].push(translations.SW_REQUIRED_RULE_NAME);
      }

      if (hasIncident && !actionParams.subActionParams.incident.alertId?.length) {
        errors['subActionParams.incident.alertId'].push(translations.SW_REQUIRED_ALERT_ID);
      }

      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./swimlane_connectors')),
    actionParamsFields: lazy(() => import('./swimlane_params')),
  };
}
