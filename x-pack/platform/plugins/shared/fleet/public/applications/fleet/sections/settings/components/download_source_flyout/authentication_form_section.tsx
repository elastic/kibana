/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { SecretFormRow } from '../edit_output_flyout/output_form_secret_form_row';

import type { AuthType, DownloadSourceFormInputsType } from './use_download_source_flyout_form';
import { DownloadSourceHeaders } from './download_source_headers';

const AUTH_TYPE_OPTIONS = [
  {
    id: 'none',
    label: i18n.translate('xpack.fleet.settings.editDownloadSourcesFlyout.authTypeNone', {
      defaultMessage: 'None',
    }),
  },
  {
    id: 'username_password',
    label: i18n.translate(
      'xpack.fleet.settings.editDownloadSourcesFlyout.authTypeUsernamePassword',
      { defaultMessage: 'Username & password' }
    ),
    iconType: 'user',
  },
  {
    id: 'api_key',
    label: i18n.translate('xpack.fleet.settings.editDownloadSourcesFlyout.authTypeApiKey', {
      defaultMessage: 'API key',
    }),
    iconType: 'key',
  },
];

function getAuthTypeLabel(authType: AuthType): string {
  switch (authType) {
    case 'username_password':
      return i18n.translate(
        'xpack.fleet.settings.editDownloadSourcesFlyout.authLabelUsernamePassword',
        { defaultMessage: 'Username & password' }
      );
    case 'api_key':
      return i18n.translate('xpack.fleet.settings.editDownloadSourcesFlyout.authLabelApiKey', {
        defaultMessage: 'API key',
      });
    default:
      return i18n.translate('xpack.fleet.settings.editDownloadSourcesFlyout.authLabelNone', {
        defaultMessage: 'None',
      });
  }
}

interface AuthenticationFormSectionProps {
  inputs: DownloadSourceFormInputsType;
  useSecretsStorage: boolean;
  isConvertedToSecretPassword: boolean;
  isConvertedToSecretApiKey: boolean;
  onToggleSecretAndClearValuePassword: (secretEnabled: boolean) => void;
  onToggleSecretAndClearValueApiKey: (secretEnabled: boolean) => void;
}

export const AuthenticationFormSection: React.FunctionComponent<AuthenticationFormSectionProps> = ({
  inputs,
  useSecretsStorage,
  isConvertedToSecretPassword,
  isConvertedToSecretApiKey,
  onToggleSecretAndClearValuePassword,
  onToggleSecretAndClearValueApiKey,
}) => {
  const authType = inputs.authTypeInput.value as AuthType;
  const hasHeaders = inputs.headersInput.value.some(
    (header) => header.key !== '' || header.value !== ''
  );
  const showAccordionOpen = authType !== 'none' || hasHeaders;

  return (
    <>
      <EuiAccordion
        initialIsOpen={showAccordionOpen}
        id="downloadSourceAuthentication"
        data-test-subj="downloadSourceAuthenticationButton"
        buttonClassName="ingest-active-button"
        buttonContent={
          <div>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.fleet.settings.editDownloadSourcesFlyout.authenticationTitle"
                  defaultMessage="Authentication"
                />
                <EuiTextColor color="subdued"> ({getAuthTypeLabel(authType)})</EuiTextColor>
              </h3>
            </EuiTitle>
          </div>
        }
      >
        <EuiSpacer size="s" />
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false} paddingSize="m">
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.fleet.settings.editDownloadSourcesFlyout.authTypeLegend',
              { defaultMessage: 'Authentication type' }
            )}
            options={AUTH_TYPE_OPTIONS}
            idSelected={authType}
            onChange={(id) => inputs.authTypeInput.setValue(id)}
            buttonSize="compressed"
            isFullWidth
            data-test-subj="downloadSourceAuthTypeButtonGroup"
          />

          {authType === 'username_password' && (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editDownloadSourcesFlyout.usernameLabel"
                    defaultMessage="Username"
                  />
                }
                {...inputs.usernameInput.formRowProps}
              >
                <EuiFieldText
                  fullWidth
                  data-test-subj="downloadSourceUsernameInput"
                  {...inputs.usernameInput.props}
                  placeholder={i18n.translate(
                    'xpack.fleet.settings.editDownloadSourcesFlyout.usernamePlaceholder',
                    { defaultMessage: 'Enter username' }
                  )}
                />
              </EuiFormRow>
              {!useSecretsStorage ? (
                <SecretFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.fleet.settings.editDownloadSourcesFlyout.passwordLabel"
                      defaultMessage="Password"
                    />
                  }
                  {...inputs.passwordInput.formRowProps}
                  useSecretsStorage={useSecretsStorage}
                  onToggleSecretStorage={onToggleSecretAndClearValuePassword}
                  disabled={!useSecretsStorage}
                  secretType="download_source_auth"
                >
                  <EuiFieldPassword
                    fullWidth
                    type="dual"
                    data-test-subj="downloadSourcePasswordInput"
                    {...inputs.passwordInput.props}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editDownloadSourcesFlyout.passwordPlaceholder',
                      { defaultMessage: 'Enter password' }
                    )}
                  />
                </SecretFormRow>
              ) : (
                <SecretFormRow
                  fullWidth
                  title={i18n.translate(
                    'xpack.fleet.settings.editDownloadSourcesFlyout.passwordSecretTitle',
                    { defaultMessage: 'Password' }
                  )}
                  {...inputs.passwordSecretInput.formRowProps}
                  useSecretsStorage={useSecretsStorage}
                  isConvertedToSecret={isConvertedToSecretPassword}
                  onToggleSecretStorage={onToggleSecretAndClearValuePassword}
                  cancelEdit={inputs.passwordSecretInput.cancelEdit}
                  secretType="download_source_auth"
                >
                  <EuiFieldPassword
                    fullWidth
                    type="dual"
                    data-test-subj="downloadSourcePasswordSecretInput"
                    {...inputs.passwordSecretInput.props}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editDownloadSourcesFlyout.passwordPlaceholder',
                      { defaultMessage: 'Enter password' }
                    )}
                  />
                </SecretFormRow>
              )}
            </>
          )}

          {authType === 'api_key' && (
            <>
              <EuiSpacer size="m" />
              {!useSecretsStorage ? (
                <SecretFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.fleet.settings.editDownloadSourcesFlyout.apiKeyLabel"
                      defaultMessage="API key"
                    />
                  }
                  {...inputs.apiKeyInput.formRowProps}
                  useSecretsStorage={useSecretsStorage}
                  onToggleSecretStorage={onToggleSecretAndClearValueApiKey}
                  disabled={!useSecretsStorage}
                  secretType="download_source_auth"
                >
                  <EuiFieldPassword
                    fullWidth
                    type="dual"
                    data-test-subj="downloadSourceApiKeyInput"
                    {...inputs.apiKeyInput.props}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editDownloadSourcesFlyout.apiKeyPlaceholder',
                      { defaultMessage: 'Enter your API key' }
                    )}
                  />
                </SecretFormRow>
              ) : (
                <SecretFormRow
                  fullWidth
                  title={i18n.translate(
                    'xpack.fleet.settings.editDownloadSourcesFlyout.apiKeySecretTitle',
                    { defaultMessage: 'API key' }
                  )}
                  {...inputs.apiKeySecretInput.formRowProps}
                  useSecretsStorage={useSecretsStorage}
                  isConvertedToSecret={isConvertedToSecretApiKey}
                  onToggleSecretStorage={onToggleSecretAndClearValueApiKey}
                  cancelEdit={inputs.apiKeySecretInput.cancelEdit}
                  secretType="download_source_auth"
                >
                  <EuiFieldPassword
                    fullWidth
                    type="dual"
                    data-test-subj="downloadSourceApiKeySecretInput"
                    {...inputs.apiKeySecretInput.props}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editDownloadSourcesFlyout.apiKeyPlaceholder',
                      { defaultMessage: 'Enter your API key' }
                    )}
                  />
                </SecretFormRow>
              )}
            </>
          )}

          <DownloadSourceHeaders inputs={inputs} />
        </EuiPanel>
      </EuiAccordion>
      <EuiSpacer size="m" />
    </>
  );
};
