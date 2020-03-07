/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
} from '@elastic/eui';
import {
  ActionConnectorFieldsProps,
  ActionTypeModel,
  ValidationResult,
  ActionParamsProps,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/triggers_actions_ui/public/types';

import { FieldMapping } from '../../pages/case/components/configure_cases/field_mapping';

import * as i18n from './translations';

import { ServiceNowActionConnector } from './types';
import { isUrlInvalid } from './validators';

import { connectors } from './config';
import { CasesConfigurationMapping } from '../../containers/case/configure/types';

const serviceNowDefinition = connectors.get('.servicenow')!;

interface ServiceNowActionParams {
  message: string;
}

export function getActionType(): ActionTypeModel {
  return {
    id: serviceNowDefinition.actionTypeId,
    iconClass: serviceNowDefinition.logo,
    selectMessage: i18n.SERVICENOW_DESC,
    actionTypeTitle: i18n.SERVICENOW_TITLE,
    validateConnector: (action: ServiceNowActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        apiUrl: [] as string[],
        username: [] as string[],
        password: [] as string[],
      };

      if (!action.config.apiUrl) {
        errors.apiUrl.push(i18n.SERVICENOW_API_URL_REQUIRED);
      }

      if (isUrlInvalid(action.config.apiUrl)) {
        errors.apiUrl.push(i18n.SERVICENOW_API_URL_INVALID);
      }

      if (!action.secrets.username) {
        errors.username.push(i18n.SERVICENOW_USERNAME_REQUIRED);
      }

      if (!action.secrets.password) {
        errors.password.push(i18n.SERVICENOW_PASSWORD_REQUIRED);
      }

      validationResult.errors = errors;
      return validationResult;
    },
    validateParams: (actionParams: ServiceNowActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: [] as string[],
      };
      validationResult.errors = errors;
      return validationResult;
    },
    actionConnectorFields: ServiceNowConnectorFields,
    actionParamsFields: ServiceNowParamsFields,
  };
}

const ServiceNowConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  ServiceNowActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors }) => {
  const { apiUrl, casesConfiguration } = action.config;
  const { username, password } = action.secrets;

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl !== undefined;
  const isUsernameInvalid: boolean = errors.username.length > 0 && username !== undefined;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password !== undefined;

  const defaultMapping = [
    {
      source: 'title',
      target: 'description',
      actionType: 'overwrite',
    },
    {
      source: 'description',
      target: 'short_description',
      actionType: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      actionType: 'append',
    },
  ];

  const mappings = casesConfiguration?.mapping ?? defaultMapping;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="apiUrl"
            fullWidth
            error={errors.apiUrl}
            isInvalid={isApiUrlInvalid}
            label={i18n.SERVICENOW_API_URL_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isApiUrlInvalid}
              name="apiUrl"
              value={apiUrl}
              data-test-subj="apiUrlFromInput"
              placeholder="https://<instance>.service-now.com"
              onChange={e => {
                editActionConfig('apiUrl', e.target.value);
              }}
              onBlur={() => {
                if (!apiUrl) {
                  editActionConfig('apiUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="username"
            fullWidth
            error={errors.username}
            isInvalid={isUsernameInvalid}
            label={i18n.SERVICENOW_USERNAME_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isUsernameInvalid}
              name="username"
              value={username}
              data-test-subj="usernameFromInput"
              onChange={e => {
                editActionSecrets('username', e.target.value);
              }}
              onBlur={() => {
                if (!username) {
                  editActionSecrets('username', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="password"
            fullWidth
            error={errors.password}
            isInvalid={isPasswordInvalid}
            label={i18n.SERVICENOW_PASSWORD_LABEL}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={isPasswordInvalid}
              name="password"
              value={password}
              data-test-subj="passwordFromInput"
              onChange={e => {
                editActionSecrets('password', e.target.value);
              }}
              onBlur={() => {
                if (!password) {
                  editActionSecrets('password', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <FieldMapping
            disabled={false}
            mappings={mappings as CasesConfigurationMapping[]}
            onChangeMappings={newMappings => {
              editActionConfig('casesConfiguration', { mapping: newMappings });
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const ServiceNowParamsFields: React.FunctionComponent<ActionParamsProps<
  ServiceNowActionParams
>> = ({ actionParams, editAction, index, errors }) => {
  return null;
};
