/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import type {
  NewOtlpOutput,
  OtlpAuthScheme,
  OtlpAzureAuth,
  OtlpAzureAuthMethod,
  OtlpOutputAuth,
} from '../../../../../../../common/types/models';
import {
  OTLP_AUTHORIZATION_HEADER,
  otlpAuthScheme,
  otlpAuthType,
  otlpAzureAuthMethod,
  otlpProtocol,
} from '../../../../../../../common/constants';

import { sendsToManagedOtlpHost } from '../../../../../../../common/services/otlp_auth';

import { useInput, useSecretInput } from '../../../../hooks';

import {
  validateOtlpAuthCredentialSecret,
  validateOtlpAuthGrpcHeaderName,
  validateOtlpAuthHeaderName,
  validateOtlpAzureClientId,
  validateOtlpAzureClientSecretSecret,
  validateOtlpAzureOptionalClientId,
  validateOtlpAzureScope,
  validateOtlpAzureTenantId,
} from './output_form_validators';

export const OTLP_AUTH_TYPE_NONE = 'none';

type SecretInput = ReturnType<typeof useSecretInput>;

/**
 * A secret row is removed while it does not apply, and shows the saved secret when it is back: a
 * replacement, entered or left blank, must not be saved unseen. An empty value is the same as no
 * value, so that an output that is not edited stays unchanged.
 */
function useCancelHiddenSecretEdit(
  input: SecretInput,
  storedValue: SecretInput['value'],
  isShown: boolean
) {
  const { cancelEdit, value } = input;
  const isEdited = (value || undefined) !== (storedValue || undefined);
  useEffect(() => {
    if (!isShown && isEdited) {
      cancelEdit();
    }
  }, [isShown, isEdited, cancelEdit]);
}

/** The inputs of the authentication of the OTLP output with an endpoint that is not managed. */
export function useOtlpAuthInputs(
  otlpOutput: NewOtlpOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const auth = otlpOutput?.auth ?? undefined;
  const azureAuth: OtlpAzureAuth | undefined = auth?.type === otlpAuthType.Azure ? auth : undefined;

  const otlpAuthTypeInput = useInput(auth?.type ?? OTLP_AUTH_TYPE_NONE, undefined, disabled);
  const isHeaderAuth =
    otlpAuthTypeInput.value === otlpAuthType.AuthHeader ||
    otlpAuthTypeInput.value === otlpAuthType.CustomHeader;
  const isAzure = otlpAuthTypeInput.value === otlpAuthType.Azure;
  const isCustomHeader = otlpAuthTypeInput.value === otlpAuthType.CustomHeader;

  const otlpAuthSchemeInput = useInput(
    auth?.type === otlpAuthType.AuthHeader ? auth.scheme : otlpAuthScheme.ApiKey,
    undefined,
    disabled
  );
  const otlpAuthHeaderNameInput = useInput(
    auth?.type === otlpAuthType.CustomHeader ? auth.name : '',
    isSelected && isCustomHeader ? validateOtlpAuthHeaderName : undefined,
    disabled
  );
  const storedCredential = otlpOutput?.secrets?.auth?.credential;
  const otlpAuthCredentialInput = useSecretInput(
    storedCredential,
    isSelected && isHeaderAuth ? validateOtlpAuthCredentialSecret : undefined,
    disabled
  );
  useCancelHiddenSecretEdit(otlpAuthCredentialInput, storedCredential, isHeaderAuth);

  const otlpAzureAuthMethodInput = useInput(
    azureAuth?.azure_auth_method ?? otlpAzureAuthMethod.ManagedIdentity,
    undefined,
    disabled
  );
  const isServicePrincipal =
    isAzure && otlpAzureAuthMethodInput.value === otlpAzureAuthMethod.ServicePrincipal;
  const otlpAzureClientIdInput = useInput(
    azureAuth?.client_id ?? '',
    isSelected && isAzure
      ? isServicePrincipal
        ? validateOtlpAzureClientId
        : validateOtlpAzureOptionalClientId
      : undefined,
    disabled
  );
  const otlpAzureTenantIdInput = useInput(
    azureAuth?.tenant_id ?? '',
    isSelected && isServicePrincipal ? validateOtlpAzureTenantId : undefined,
    disabled
  );
  const otlpAzureScopeInput = useInput(
    azureAuth?.scopes?.[0] ?? '',
    isSelected && isAzure ? validateOtlpAzureScope : undefined,
    disabled
  );
  const storedAzureClientSecret = otlpOutput?.secrets?.auth?.azure_client_secret;
  const otlpAzureClientSecretInput = useSecretInput(
    storedAzureClientSecret,
    isSelected && isServicePrincipal ? validateOtlpAzureClientSecretSecret : undefined,
    disabled
  );
  useCancelHiddenSecretEdit(
    otlpAzureClientSecretInput,
    storedAzureClientSecret,
    isServicePrincipal
  );

  // the settings of one method do not apply to the other: switching the method clears them
  const azureAuthMethod = otlpAzureAuthMethodInput.value;
  const previousAzureAuthMethod = useRef(azureAuthMethod);
  const { setValue: setClientId, setErrors: setClientIdErrors } = otlpAzureClientIdInput;
  const { setValue: setTenantId, setErrors: setTenantIdErrors } = otlpAzureTenantIdInput;
  useEffect(() => {
    if (previousAzureAuthMethod.current === azureAuthMethod) {
      return;
    }
    previousAzureAuthMethod.current = azureAuthMethod;
    setClientId('');
    setClientIdErrors(undefined);
    setTenantId('');
    setTenantIdErrors(undefined);
  }, [azureAuthMethod, setClientId, setClientIdErrors, setTenantId, setTenantIdErrors]);

  return {
    otlpAuthTypeInput,
    otlpAuthSchemeInput,
    otlpAuthHeaderNameInput,
    otlpAuthCredentialInput,
    otlpAzureAuthMethodInput,
    otlpAzureClientIdInput,
    otlpAzureTenantIdInput,
    otlpAzureScopeInput,
    otlpAzureClientSecretInput,
  };
}

export type OtlpAuthInputs = ReturnType<typeof useOtlpAuthInputs>;

/**
 * The managed OTLP endpoint is authenticated by Fleet: an output that sends data to it, for any
 * signal, has no authentication.
 */
export const isOtlpAuthAvailable = (endpoints: string[], managedOtlpUrl: string | undefined) =>
  !sendsToManagedOtlpHost(endpoints, managedOtlpUrl);

export const isOtlpAuthSelected = (inputs: OtlpAuthInputs) =>
  inputs.otlpAuthTypeInput.value !== OTLP_AUTH_TYPE_NONE;

export const isOtlpAzureAuthSelected = (inputs: OtlpAuthInputs) =>
  inputs.otlpAuthTypeInput.value === otlpAuthType.Azure;

export const isOtlpAzureServicePrincipalSelected = (inputs: OtlpAuthInputs) =>
  isOtlpAzureAuthSelected(inputs) &&
  inputs.otlpAzureAuthMethodInput.value === otlpAzureAuthMethod.ServicePrincipal;

/** The name of the header that the selected authentication sets, if any. */
export const getSelectedOtlpAuthHeaderName = (inputs: OtlpAuthInputs): string | undefined => {
  if (!isOtlpAuthSelected(inputs)) {
    return undefined;
  }
  return inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader
    ? inputs.otlpAuthHeaderNameInput.value.trim() || undefined
    : OTLP_AUTHORIZATION_HEADER;
};

/**
 * Why the exporter cannot be authenticated with Azure, if it cannot: the `azure_auth` extension
 * only authenticates HTTP requests, and the bearer token must only be sent over verified TLS.
 */
export const getOtlpAzureAuthError = (
  protocol: string,
  endpoints: string[]
): string | undefined => {
  if (protocol !== otlpProtocol.HttpProtobuf) {
    return i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAzureAuthGrpcError', {
      defaultMessage:
        'Azure authentication requires the HTTP/Protobuf protocol. Select HTTP/Protobuf, or another authentication type.',
    });
  }
  if (endpoints.some((endpoint) => !/^https:\/\//i.test(endpoint.trim()))) {
    return i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpAzureAuthHttpsError', {
      defaultMessage: 'Azure authentication requires https:// endpoints.',
    });
  }
};

/**
 * Validates every input, so all the errors are shown. Returns whether they are all valid. The
 * gRPC exporter sends the custom header as metadata, which allows fewer characters.
 */
export const validateOtlpAuthInputs = (
  inputs: OtlpAuthInputs,
  protocol: string,
  endpoints: string[]
): boolean => {
  if (!isOtlpAuthSelected(inputs)) {
    return true;
  }
  if (isOtlpAzureAuthSelected(inputs)) {
    const isServicePrincipal = isOtlpAzureServicePrincipalSelected(inputs);
    return [
      !getOtlpAzureAuthError(protocol, endpoints),
      inputs.otlpAzureClientIdInput.validate(),
      !isServicePrincipal || inputs.otlpAzureTenantIdInput.validate(),
      inputs.otlpAzureScopeInput.validate(),
      !isServicePrincipal || inputs.otlpAzureClientSecretInput.validate(),
    ].every(Boolean);
  }
  let headerNameValid = inputs.otlpAuthHeaderNameInput.validate();
  if (
    headerNameValid &&
    protocol === otlpProtocol.Grpc &&
    inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader
  ) {
    const errors = validateOtlpAuthGrpcHeaderName(inputs.otlpAuthHeaderNameInput.value);
    inputs.otlpAuthHeaderNameInput.setErrors(errors);
    headerNameValid = !errors;
  }
  return [headerNameValid, inputs.otlpAuthCredentialInput.validate()].every(Boolean);
};

/** A pasted value often ends with a line break, which would make it invalid. */
const trimSecret = (value: SecretInput['value']) => (typeof value === 'string' ? value.trim() : '');

function buildOtlpAzureAuth(inputs: OtlpAuthInputs): Pick<NewOtlpOutput, 'auth' | 'secrets'> {
  const method = inputs.otlpAzureAuthMethodInput.value as OtlpAzureAuthMethod;
  const isServicePrincipal = method === otlpAzureAuthMethod.ServicePrincipal;
  const clientId = inputs.otlpAzureClientIdInput.value.trim();
  const tenantId = inputs.otlpAzureTenantIdInput.value.trim();
  const scope = inputs.otlpAzureScopeInput.value.trim();
  const clientSecret = isServicePrincipal
    ? trimSecret(inputs.otlpAzureClientSecretInput.value)
    : '';

  return {
    auth: {
      type: otlpAuthType.Azure,
      azure_auth_method: method,
      ...(clientId ? { client_id: clientId } : {}),
      ...(isServicePrincipal && tenantId ? { tenant_id: tenantId } : {}),
      ...(scope ? { scopes: [scope] } : {}),
    },
    ...(clientSecret ? { secrets: { auth: { azure_client_secret: clientSecret } } } : {}),
  };
}

/**
 * Builds the authentication of the payload: `auth: null` removes a stored one with its secret. A
 * stored secret that was not edited is left out, so the update keeps it.
 */
export function buildOtlpAuth(
  inputs: OtlpAuthInputs,
  { hasStoredAuth }: { hasStoredAuth: boolean }
): Pick<NewOtlpOutput, 'auth' | 'secrets'> {
  if (!isOtlpAuthSelected(inputs)) {
    return hasStoredAuth ? { auth: null } : {};
  }
  if (isOtlpAzureAuthSelected(inputs)) {
    return buildOtlpAzureAuth(inputs);
  }

  const auth: OtlpOutputAuth =
    inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader
      ? { type: otlpAuthType.CustomHeader, name: inputs.otlpAuthHeaderNameInput.value.trim() }
      : {
          type: otlpAuthType.AuthHeader,
          scheme: inputs.otlpAuthSchemeInput.value as OtlpAuthScheme,
        };
  const trimmedCredential = trimSecret(inputs.otlpAuthCredentialInput.value);

  return {
    auth,
    ...(trimmedCredential ? { secrets: { auth: { credential: trimmedCredential } } } : {}),
  };
}
