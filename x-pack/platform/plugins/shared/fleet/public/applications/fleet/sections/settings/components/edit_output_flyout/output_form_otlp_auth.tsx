/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldPassword, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { otlpAuthScheme, otlpAuthType } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';
import { OTLP_AUTH_TYPE_NONE, isOtlpAuthSelected } from './use_otlp_auth_inputs';
import { OtlpSelectSetting, OtlpSettingsGroup, OtlpTextSetting } from './otlp_setting_fields';
import { SecretFormRow } from './output_form_secret_form_row';

const AUTH_TYPE_OPTIONS = [
  {
    value: OTLP_AUTH_TYPE_NONE,
    text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthTypeNone', {
      defaultMessage: 'None',
    }),
  },
  {
    value: otlpAuthType.AuthHeader,
    text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthTypeAuthHeader', {
      defaultMessage: 'Authorization header',
    }),
  },
  {
    value: otlpAuthType.CustomHeader,
    text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthTypeCustomHeader', {
      defaultMessage: 'Custom header',
    }),
  },
];

const AUTH_SCHEME_OPTIONS = [
  { value: otlpAuthScheme.ApiKey, text: 'ApiKey' },
  { value: otlpAuthScheme.BearerToken, text: 'Bearer' },
];

/**
 * The authentication of the OTLP output. It is not shown for the managed OTLP endpoint, which
 * Fleet authenticates with an API key of its own.
 */
export const OtlpAuthentication: React.FunctionComponent<{
  inputs: OutputFormInputsType;
  /** Whether the output sends data to the managed OTLP endpoint, which has no authentication. */
  isManagedEndpoint: boolean;
}> = ({ inputs, isManagedEndpoint }) => {
  const isCustomHeader = inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader;

  return (
    <OtlpSettingsGroup
      testSubj="otlpAuthentication"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpAuthTitle"
          defaultMessage="Authentication"
        />
      }
    >
      <OtlpSelectSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAuthTypeLabel"
            defaultMessage="Authentication type"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAuthTypeHelpText"
            defaultMessage="The header that carries the credential. The credential is sent as it is entered, it is not encoded."
          />
        }
        input={inputs.otlpAuthTypeInput}
        testSubj="otlpAuthTypeInput"
        options={AUTH_TYPE_OPTIONS}
        error={
          isManagedEndpoint && isOtlpAuthSelected(inputs)
            ? i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthManagedEndpointError', {
                defaultMessage:
                  'The managed OTLP endpoint is authenticated by Fleet. Select None to remove this authentication, or use another endpoint.',
              })
            : undefined
        }
      />
      {isOtlpAuthSelected(inputs) && (
        <>
          {isCustomHeader ? (
            <OtlpTextSetting
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpAuthHeaderNameLabel"
                  defaultMessage="Header name"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpAuthHeaderNameHelpText"
                  defaultMessage="The header sent with the credential as value, such as {example}."
                  values={{ example: 'x-api-key' }}
                />
              }
              input={inputs.otlpAuthHeaderNameInput}
              testSubj="otlpAuthHeaderNameInput"
              placeholder="x-api-key"
            />
          ) : (
            <OtlpSelectSetting
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpAuthSchemeLabel"
                  defaultMessage="Scheme"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpAuthSchemeHelpText"
                  defaultMessage="Sent as {header}."
                  values={{ header: <code>{'Authorization: <scheme> <credential>'}</code> }}
                />
              }
              input={inputs.otlpAuthSchemeInput}
              testSubj="otlpAuthSchemeInput"
              options={AUTH_SCHEME_OPTIONS}
            />
          )}
          <EuiSpacer size="s" />
          <SecretFormRow
            fullWidth
            title={i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthCredentialLabel', {
              defaultMessage: 'Credential',
            })}
            {...inputs.otlpAuthCredentialInput.formRowProps}
            useSecretsStorage={true}
            cancelEdit={inputs.otlpAuthCredentialInput.cancelEdit}
          >
            <EuiFieldPassword
              type="dual"
              fullWidth
              data-test-subj="settingsOutputsFlyout.otlpAuthCredentialInput"
              {...inputs.otlpAuthCredentialInput.props}
            />
          </SecretFormRow>
        </>
      )}
    </OtlpSettingsGroup>
  );
};
