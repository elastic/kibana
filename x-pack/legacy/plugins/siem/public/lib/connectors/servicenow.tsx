/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, ChangeEvent } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
} from '@elastic/eui';

import { isEmpty, get } from 'lodash/fp';

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

import { connectors, defaultMapping } from './config';
import { CasesConfigurationMapping } from '../../containers/case/configure/types';

const serviceNowDefinition = connectors['.servicenow'];

interface ServiceNowActionParams {
  message: string;
}

interface Errors {
  apiUrl: string[];
  username: string[];
  password: string[];
}

export function getActionType(): ActionTypeModel {
  return {
    id: serviceNowDefinition.actionTypeId,
    iconClass: serviceNowDefinition.logo,
    selectMessage: i18n.SERVICENOW_DESC,
    actionTypeTitle: i18n.SERVICENOW_TITLE,
    validateConnector: (action: ServiceNowActionConnector): ValidationResult => {
      const errors: Errors = {
        apiUrl: [],
        username: [],
        password: [],
      };

      if (!action.config.apiUrl) {
        errors.apiUrl = [...errors.apiUrl, i18n.SERVICENOW_API_URL_REQUIRED];
      }

      if (isUrlInvalid(action.config.apiUrl)) {
        errors.apiUrl = [...errors.apiUrl, i18n.SERVICENOW_API_URL_INVALID];
      }

      if (!action.secrets.username) {
        errors.username = [...errors.username, i18n.SERVICENOW_USERNAME_REQUIRED];
      }

      if (!action.secrets.password) {
        errors.password = [...errors.password, i18n.SERVICENOW_PASSWORD_REQUIRED];
      }

      return { errors };
    },
    validateParams: (actionParams: ServiceNowActionParams): ValidationResult => {
      return { errors: {} };
    },
    actionConnectorFields: ServiceNowConnectorFields,
    actionParamsFields: ServiceNowParamsFields,
  };
}

const ServiceNowConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  ServiceNowActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors }) => {
  const { apiUrl, casesConfiguration: { mapping = [] } = {} } = action.config;
  const { username, password } = action.secrets;

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;
  const isUsernameInvalid: boolean = errors.username.length > 0 && username != null;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password != null;

  if (isEmpty(mapping)) {
    editActionConfig('casesConfiguration', {
      ...action.config.casesConfiguration,
      mapping: defaultMapping,
    });
  }

  const handleOnChangeActionConfig = useCallback(
    (key: string, evt: ChangeEvent<HTMLInputElement>) => editActionConfig(key, evt.target.value),
    []
  );

  const handleOnBlurActionConfig = useCallback(
    (key: string) => {
      if (key === 'apiUrl' && action.config[key] == null) {
        editActionConfig(key, '');
      }
    },
    [action.config]
  );

  const handleOnChangeSecretConfig = useCallback(
    (key: string, evt: ChangeEvent<HTMLInputElement>) => editActionSecrets(key, evt.target.value),
    []
  );

  const handleOnBlurSecretConfig = useCallback(
    (key: string) => {
      if (['username', 'password'].includes(key) && get(key, action.secrets) == null) {
        editActionSecrets(key, '');
      }
    },
    [action.secrets]
  );

  const handleOnChangeMappingConfig = useCallback(
    (newMapping: CasesConfigurationMapping[]) =>
      editActionConfig('casesConfiguration', {
        ...action.config.casesConfiguration,
        mapping: newMapping,
      }),
    [action.config]
  );

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
              onChange={handleOnChangeActionConfig.bind(null, 'apiUrl')}
              onBlur={handleOnBlurActionConfig.bind(null, 'apiUrl')}
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
              onChange={handleOnChangeSecretConfig.bind(null, 'username')}
              onBlur={handleOnBlurSecretConfig.bind(null, 'username')}
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
              onChange={handleOnChangeSecretConfig.bind(null, 'password')}
              onBlur={handleOnBlurSecretConfig.bind(null, 'password')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="xs" />
          <FieldMapping
            disabled={false}
            mapping={mapping as CasesConfigurationMapping[]}
            onChangeMapping={handleOnChangeMappingConfig}
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
