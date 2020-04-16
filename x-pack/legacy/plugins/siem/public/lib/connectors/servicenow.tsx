/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, ChangeEvent, useEffect } from 'react';
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
  /* We do not provide defaults values to the fields (like empty string for apiUrl) intentionally.
   * If we do, errors will be shown the first time the flyout is open even though the user did not
   * interact with the form. Also, we would like to show errors for empty fields provided by the user.
  /*/
  const { apiUrl, casesConfiguration: { mapping = [] } = {} } = action.config;
  const { username, password } = action.secrets;

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;
  const isUsernameInvalid: boolean = errors.username.length > 0 && username != null;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password != null;

  /**
   * We need to distinguish between the add flyout and the edit flyout.
   * useEffect will run only once on component mount.
   * This guarantees that the function below will run only once.
   * On the first render of the component the apiUrl can be either undefined or filled.
   * If it is filled then we are on the edit flyout. Otherwise we are on the add flyout.
   */

  useEffect(() => {
    if (!isEmpty(apiUrl)) {
      editActionSecrets('username', '');
      editActionSecrets('password', '');
    }
  }, []);

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
              value={apiUrl || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiUrlFromInput"
              placeholder="https://<instance>.service-now.com"
              onChange={handleOnChangeActionConfig.bind(null, 'apiUrl')}
              onBlur={handleOnBlurActionConfig.bind(null, 'apiUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-servicenow-username"
            fullWidth
            error={errors.username}
            isInvalid={isUsernameInvalid}
            label={i18n.SERVICENOW_USERNAME_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isUsernameInvalid}
              name="connector-servicenow-username"
              value={username || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="usernameFromInput"
              onChange={handleOnChangeSecretConfig.bind(null, 'username')}
              onBlur={handleOnBlurSecretConfig.bind(null, 'username')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-servicenow-password"
            fullWidth
            error={errors.password}
            isInvalid={isPasswordInvalid}
            label={i18n.SERVICENOW_PASSWORD_LABEL}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={isPasswordInvalid}
              name="connector-servicenow-password"
              value={password || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="passwordFromInput"
              onChange={handleOnChangeSecretConfig.bind(null, 'password')}
              onBlur={handleOnBlurSecretConfig.bind(null, 'password')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <FieldMapping
            disabled={true}
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
