/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  TextField,
  PasswordField,
  TextAreaField,
  CardRadioGroupField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { AUTH_TYPE } from '@kbn/connector-schemas/ssh_host';
import type { AuthType } from '@kbn/connector-schemas/ssh_host';

const { emptyField } = fieldValidators;

const SshHostConnectorFieldsComponent: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const [{ config }] = useFormData<{ config: { authType: AuthType } }>({
    watch: 'config.authType',
  });
  const authType = config?.authType ?? AUTH_TYPE.PrivateKey;

  const authOptions = [
    {
      value: AUTH_TYPE.PrivateKey,
      label: i18n.translate('xpack.stackConnectors.components.sshHost.authType.privateKey', {
        defaultMessage: 'Private key',
      }),
      'data-test-subj': 'sshHostAuthPrivateKey',
      children: authType === AUTH_TYPE.PrivateKey && (
        <UseField
          path="secrets.sshPrivateKey"
          component={TextAreaField}
          config={{
            label: i18n.translate('xpack.stackConnectors.components.sshHost.privateKeyLabel', {
              defaultMessage: 'SSH private key',
            }),
            validations: [
              {
                validator: emptyField(
                  i18n.translate('xpack.stackConnectors.components.sshHost.privateKeyRequired', {
                    defaultMessage: 'SSH private key is required.',
                  })
                ),
              },
            ],
          }}
          componentProps={{
            euiFieldProps: {
              readOnly,
              rows: 8,
              fullWidth: true,
              'data-test-subj': 'sshHostPrivateKeyInput',
            },
          }}
        />
      ),
    },
    {
      value: AUTH_TYPE.Password,
      label: i18n.translate('xpack.stackConnectors.components.sshHost.authType.password', {
        defaultMessage: 'Password',
      }),
      'data-test-subj': 'sshHostAuthPassword',
      children: authType === AUTH_TYPE.Password && (
        <UseField
          path="secrets.password"
          component={PasswordField}
          config={{
            label: i18n.translate('xpack.stackConnectors.components.sshHost.passwordLabel', {
              defaultMessage: 'Password',
            }),
            validations: [
              {
                validator: emptyField(
                  i18n.translate('xpack.stackConnectors.components.sshHost.passwordRequired', {
                    defaultMessage: 'Password is required.',
                  })
                ),
              },
            ],
          }}
          componentProps={{
            euiFieldProps: {
              readOnly,
              fullWidth: true,
              'data-test-subj': 'sshHostPasswordInput',
            },
          }}
        />
      ),
    },
  ];

  return (
    <>
      <UseField
        path="config.host"
        component={TextField}
        config={{
          label: i18n.translate('xpack.stackConnectors.components.sshHost.hostLabel', {
            defaultMessage: 'Host',
          }),
          validations: [
            {
              validator: emptyField(
                i18n.translate('xpack.stackConnectors.components.sshHost.hostRequired', {
                  defaultMessage: 'Host is required.',
                })
              ),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            placeholder: 'IP address or IP:port',
            fullWidth: true,
            'data-test-subj': 'sshHostHostInput',
          },
        }}
      />
      <EuiSpacer size="m" />
      <UseField
        path="secrets.username"
        component={TextField}
        config={{
          label: i18n.translate('xpack.stackConnectors.components.sshHost.usernameLabel', {
            defaultMessage: 'Username',
          }),
          validations: [
            {
              validator: emptyField(
                i18n.translate('xpack.stackConnectors.components.sshHost.usernameRequired', {
                  defaultMessage: 'Username is required.',
                })
              ),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            fullWidth: true,
            'data-test-subj': 'sshHostUsernameInput',
          },
        }}
      />
      <EuiSpacer size="m" />
      <UseField
        path="config.authType"
        component={CardRadioGroupField}
        config={{
          label: i18n.translate('xpack.stackConnectors.components.sshHost.authTypeLabel', {
            defaultMessage: 'Authentication',
          }),
          defaultValue: AUTH_TYPE.PrivateKey,
        }}
        componentProps={{ options: authOptions }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SshHostConnectorFieldsComponent as default };
