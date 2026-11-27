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

import {
  OTLP_AZURE_AUTH_MINIMUM_AGENT_VERSION,
  otlpAuthScheme,
  otlpAuthType,
  otlpAzureAuthMethod,
  otlpProtocol,
} from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';
import {
  OTLP_AUTH_TYPE_NONE,
  getOtlpAzureAuthError,
  isOtlpAuthSelected,
  isOtlpAzureAuthSelected,
  isOtlpAzureServicePrincipalSelected,
} from './use_otlp_auth_inputs';
import { getOtlpInputEndpoints } from './use_otlp_inputs';
import { OtlpSelectSetting, OtlpSettingsGroup, OtlpTextSetting } from './otlp_setting_fields';
import { SecretFormRow } from './output_form_secret_form_row';

const AUTH_TYPE_NONE_OPTION = {
  value: OTLP_AUTH_TYPE_NONE,
  text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthTypeNone', {
    defaultMessage: 'None',
  }),
};
const AUTH_HEADER_OPTION = {
  value: otlpAuthType.AuthHeader,
  text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthTypeAuthHeader', {
    defaultMessage: 'Authorization header',
  }),
};
const CUSTOM_HEADER_OPTION = {
  value: otlpAuthType.CustomHeader,
  text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthTypeCustomHeader', {
    defaultMessage: 'Custom header',
  }),
};
const AZURE_OPTION_TEXT = i18n.translate(
  'xpack.fleet.settings.editOutputFlyout.otlpAuthTypeAzure',
  {
    defaultMessage: 'Azure',
  }
);
const AZURE_GRPC_OPTION_TEXT = i18n.translate(
  'xpack.fleet.settings.editOutputFlyout.otlpAuthTypeAzureGrpc',
  { defaultMessage: 'Azure (requires HTTP/Protobuf)' }
);

/** Azure authentication only applies to HTTP requests: it cannot be selected with gRPC. */
const getAuthTypeOptions = (isGrpc: boolean) => [
  AUTH_TYPE_NONE_OPTION,
  AUTH_HEADER_OPTION,
  CUSTOM_HEADER_OPTION,
  {
    value: otlpAuthType.Azure,
    text: isGrpc ? AZURE_GRPC_OPTION_TEXT : AZURE_OPTION_TEXT,
    disabled: isGrpc,
  },
];

const AUTH_SCHEME_OPTIONS = [
  { value: otlpAuthScheme.ApiKey, text: 'ApiKey' },
  { value: otlpAuthScheme.BearerToken, text: 'Bearer' },
];

const AZURE_AUTH_METHOD_OPTIONS = [
  {
    value: otlpAzureAuthMethod.ManagedIdentity,
    text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAzureManagedIdentity', {
      defaultMessage: 'Managed identity',
    }),
  },
  {
    value: otlpAzureAuthMethod.ServicePrincipal,
    text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAzureServicePrincipal', {
      defaultMessage: 'Service principal',
    }),
  },
];

const HeaderAuthSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => (
  <>
    {inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader ? (
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
);

const AzureAuthSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const isServicePrincipal = isOtlpAzureServicePrincipalSelected(inputs);

  return (
    <>
      <OtlpSelectSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAzureAuthMethodLabel"
            defaultMessage="Authentication method"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAzureAuthMethodHelpText"
            defaultMessage="The identity the collector requests the Microsoft Entra ID token with. Changing the method clears its settings."
          />
        }
        input={inputs.otlpAzureAuthMethodInput}
        testSubj="otlpAzureAuthMethodInput"
        options={AZURE_AUTH_METHOD_OPTIONS}
      />
      {isServicePrincipal && (
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAzureTenantIdLabel"
              defaultMessage="Tenant ID"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAzureTenantIdHelpText"
              defaultMessage="The directory (tenant) ID of the app registration."
            />
          }
          input={inputs.otlpAzureTenantIdInput}
          testSubj="otlpAzureTenantIdInput"
        />
      )}
      <OtlpTextSetting
        label={
          isServicePrincipal ? (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAzureClientIdLabel"
              defaultMessage="Client ID"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAzureOptionalClientIdLabel"
              defaultMessage="Client ID (optional)"
            />
          )
        }
        helpText={
          isServicePrincipal ? (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAzureClientIdHelpText"
              defaultMessage="The application (client) ID of the app registration."
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAzureManagedIdentityClientIdHelpText"
              defaultMessage="Applies to user-assigned identities only. Leave empty to use the system-assigned identity."
            />
          )
        }
        input={inputs.otlpAzureClientIdInput}
        testSubj="otlpAzureClientIdInput"
      />
      {isServicePrincipal && (
        <>
          <EuiSpacer size="s" />
          <SecretFormRow
            fullWidth
            title={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.otlpAzureClientSecretLabel',
              { defaultMessage: 'Client secret' }
            )}
            {...inputs.otlpAzureClientSecretInput.formRowProps}
            useSecretsStorage={true}
            cancelEdit={inputs.otlpAzureClientSecretInput.cancelEdit}
          >
            <EuiFieldPassword
              type="dual"
              fullWidth
              data-test-subj="settingsOutputsFlyout.otlpAzureClientSecretInput"
              {...inputs.otlpAzureClientSecretInput.props}
            />
          </SecretFormRow>
          <EuiSpacer size="s" />
        </>
      )}
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAzureScopeLabel"
            defaultMessage="Scope (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAzureScopeHelpText"
            defaultMessage="The scope the token is requested for, when the audience of the endpoint differs from its host, such as {example} for Azure Monitor. Default: {defaultScope}."
            values={{
              example: <code>{'https://monitor.azure.com/.default'}</code>,
              defaultScope: <code>{'https://<endpoint host>/.default'}</code>,
            }}
          />
        }
        input={inputs.otlpAzureScopeInput}
        testSubj="otlpAzureScopeInput"
        placeholder="https://monitor.azure.com/.default"
      />
    </>
  );
};

/**
 * The authentication of the OTLP output. It is not shown for the managed OTLP endpoint, which
 * Fleet authenticates with an API key of its own.
 */
export const OtlpAuthentication: React.FunctionComponent<{
  inputs: OutputFormInputsType;
  /** Whether the output sends data to the managed OTLP endpoint, which has no authentication. */
  isManagedEndpoint: boolean;
}> = ({ inputs, isManagedEndpoint }) => {
  const isAzure = isOtlpAzureAuthSelected(inputs);
  const isGrpc = inputs.otlpProtocolInput.value === otlpProtocol.Grpc;

  const error = isManagedEndpoint
    ? isOtlpAuthSelected(inputs)
      ? i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAuthManagedEndpointError', {
          defaultMessage:
            'The managed OTLP endpoint is authenticated by Fleet. Select None to remove this authentication, or use another endpoint.',
        })
      : undefined
    : isAzure
    ? getOtlpAzureAuthError(inputs.otlpProtocolInput.value, getOtlpInputEndpoints(inputs))
    : undefined;

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
          isAzure ? (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAuthTypeAzureHelpText"
              defaultMessage="The collector requests a Microsoft Entra ID token, and sends it in the {header} header. Requires HTTP/Protobuf, https:// endpoints, and Elastic Agent {minAgentVersion} or later."
              values={{
                header: <code>{'Authorization'}</code>,
                minAgentVersion: OTLP_AZURE_AUTH_MINIMUM_AGENT_VERSION,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpAuthTypeHelpText"
              defaultMessage="The header that carries the credential. The credential is sent as it is entered, it is not encoded."
            />
          )
        }
        input={inputs.otlpAuthTypeInput}
        testSubj="otlpAuthTypeInput"
        // a selected Azure authentication stays selectable, so that its error is shown
        options={getAuthTypeOptions(isGrpc && !isAzure)}
        error={error}
      />
      {isOtlpAuthSelected(inputs) &&
        (isAzure ? <AzureAuthSettings inputs={inputs} /> : <HeaderAuthSettings inputs={inputs} />)}
    </OtlpSettingsGroup>
  );
};
