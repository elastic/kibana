/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  TextField,
  PasswordField,
  HiddenField,
  ButtonGroupField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { XmattersAuthenticationType } from '../types';
import * as i18n from './translations';

const { emptyField, urlField } = fieldValidators;

const isBasicAuth = (auth: { auth: string } | null | undefined) => {
  if (auth == null) {
    return true;
  }

  return auth.auth === XmattersAuthenticationType.Basic ? true : false;
};

const authenticationButtons = [
  {
    id: XmattersAuthenticationType.Basic,
    label: i18n.BASIC_AUTH_BUTTON_LABEL,
  },
  {
    id: XmattersAuthenticationType.URL,
    label: i18n.URL_AUTH_BUTTON_LABEL,
  },
];

const XmattersUrlField: React.FC<{ path: string; readOnly: boolean }> = ({ path, readOnly }) => {
  return (
    <UseField
      path={path}
      component={TextField}
      config={{
        label: i18n.URL_LABEL,
        helpText: (
          <FormattedMessage
            id="xpack.stackConnectors.components.xmatters.initiationUrlHelpText"
            defaultMessage="Include the full xMatters url."
          />
        ),
        validations: [
          {
            validator: urlField(i18n.URL_INVALID),
          },
        ],
      }}
      componentProps={{
        euiFieldProps: { 'data-test-subj': path, readOnly },
      }}
    />
  );
};

const XmattersActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { setFieldValue, getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.usesBasic', '__internal__.auth'],
  });

  const usesBasicDefaultValue =
    getFieldDefaultValue<boolean | undefined>('config.usesBasic') ?? true;

  const selectedAuthDefaultValue = usesBasicDefaultValue
    ? XmattersAuthenticationType.Basic
    : XmattersAuthenticationType.URL;

  const selectedAuth =
    config != null && !config.usesBasic
      ? XmattersAuthenticationType.URL
      : XmattersAuthenticationType.Basic;

  useEffect(() => {
    setFieldValue('config.usesBasic', isBasicAuth(__internal__));
  }, [__internal__, setFieldValue]);

  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.stackConnectors.components.xmatters.authenticationLabel"
            defaultMessage="Authentication"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <UseField
        path="__internal__.auth"
        component={ButtonGroupField}
        config={{
          label: i18n.BASIC_AUTH_LABEL,
          defaultValue: selectedAuthDefaultValue,
          validations: [
            {
              validator: emptyField(i18n.BASIC_AUTH_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            legend: i18n.BASIC_AUTH_BUTTON_GROUP_LEGEND,
            options: authenticationButtons,
            buttonSize: 'm',
            color: 'primary',
          },
        }}
      />
      <UseField path="config.usesBasic" component={HiddenField} config={{ defaultValue: true }} />
      <EuiSpacer size="m" />
      {selectedAuth === XmattersAuthenticationType.URL ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <XmattersUrlField path="secrets.secretsUrl" readOnly={readOnly} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      {selectedAuth === XmattersAuthenticationType.Basic ? (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <XmattersUrlField path="config.configUrl" readOnly={readOnly} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                data-test-subj="userCredsLabel"
                id="xpack.stackConnectors.components.xmatters.userCredsLabel"
                defaultMessage="User credentials"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <UseField
                path="secrets.user"
                component={TextField}
                config={{
                  label: i18n.USERNAME_LABEL,
                  validations: [
                    {
                      validator: emptyField(i18n.USERNAME_INVALID),
                    },
                  ],
                }}
                componentProps={{
                  euiFieldProps: {
                    disabled: readOnly,
                    'data-test-subj': 'xmattersUserInput',
                    readOnly,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField
                path="secrets.password"
                config={{
                  label: i18n.PASSWORD_LABEL,
                  validations: [
                    {
                      validator: emptyField(i18n.PASSWORD_REQUIRED),
                    },
                  ],
                }}
                component={PasswordField}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'xmattersPasswordInput',
                    readOnly,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { XmattersActionConnectorFields as default };
