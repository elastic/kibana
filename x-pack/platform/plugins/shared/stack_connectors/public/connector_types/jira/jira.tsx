/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  MAX_OTHER_FIELDS_LENGTH,
} from '@kbn/connector-schemas/jira/constants';
import type { JiraConfig, JiraSecrets, JiraActionParams } from './types';
import { validateJSON } from '../lib/validate_json';

export const JIRA_DESC = i18n.translate('xpack.stackConnectors.components.jira.selectMessageText', {
  defaultMessage: 'Create an incident in Jira.',
});

export function getConnectorType(): ConnectorTypeModel<JiraConfig, JiraSecrets, JiraActionParams> {
  return {
    id: CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: JIRA_DESC,
    actionTypeTitle: CONNECTOR_NAME,
    actionConnectorFields: lazy(() => import('./jira_connector_params')),
    validateParams: async (
      actionParams: JiraActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.summary': new Array<string>(),
        'subActionParams.incident.labels': new Array<string>(),
        'subActionParams.incident.otherFields': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.summary?.length
      ) {
        errors['subActionParams.incident.summary'].push(translations.SUMMARY_REQUIRED);
      }

      if (actionParams.subActionParams?.incident?.labels?.length) {
        // Jira do not allows empty spaces on labels. If the label includes a whitespace show an error.
        if (actionParams.subActionParams.incident.labels.some((label) => label.match(/\s/g)))
          errors['subActionParams.incident.labels'].push(translations.LABELS_WHITE_SPACES);
      }

      const jsonErrors = validateJSON({
        value: actionParams.subActionParams?.incident?.otherFields,
        maxProperties: MAX_OTHER_FIELDS_LENGTH,
      });

      if (jsonErrors) {
        errors['subActionParams.incident.otherFields'] = [jsonErrors];
      }

      return validationResult;
    },
    actionParamsFields: lazy(() => import('./jira_params')),
  };
}
