/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import type {
  NewOtlpOutput,
  OtlpAuthScheme,
  OtlpOutputAuth,
} from '../../../../../../../common/types/models';
import {
  OTLP_AUTHORIZATION_HEADER,
  otlpAuthScheme,
  otlpAuthType,
  otlpProtocol,
} from '../../../../../../../common/constants';

import { sendsToManagedOtlpHost } from '../../../../../../../common/services/otlp_auth';

import { useInput, useSecretInput } from '../../../../hooks';

import {
  validateOtlpAuthCredentialSecret,
  validateOtlpAuthGrpcHeaderName,
  validateOtlpAuthHeaderName,
} from './output_form_validators';

export const OTLP_AUTH_TYPE_NONE = 'none';

/** The inputs of the authentication of the OTLP output with an endpoint that is not managed. */
export function useOtlpAuthInputs(
  otlpOutput: NewOtlpOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const auth = otlpOutput?.auth ?? undefined;

  const otlpAuthTypeInput = useInput(auth?.type ?? OTLP_AUTH_TYPE_NONE, undefined, disabled);
  const isAuthSelected = isSelected && otlpAuthTypeInput.value !== OTLP_AUTH_TYPE_NONE;
  const isCustomHeader = otlpAuthTypeInput.value === otlpAuthType.CustomHeader;

  const otlpAuthSchemeInput = useInput(
    auth?.type === otlpAuthType.AuthHeader ? auth.scheme : otlpAuthScheme.ApiKey,
    undefined,
    disabled
  );
  const otlpAuthHeaderNameInput = useInput(
    auth?.type === otlpAuthType.CustomHeader ? auth.name : '',
    isAuthSelected && isCustomHeader ? validateOtlpAuthHeaderName : undefined,
    disabled
  );
  const otlpAuthCredentialInput = useSecretInput(
    otlpOutput?.secrets?.auth?.credential,
    isAuthSelected ? validateOtlpAuthCredentialSecret : undefined,
    disabled
  );

  // the credential row is removed while no authentication is selected, and shows the saved
  // credential when it is back: a replacement entered before must not be saved unseen. Only an
  // entered value is dropped, so that an output that is not edited stays unchanged.
  const { cancelEdit: cancelCredentialEdit, value: credentialValue } = otlpAuthCredentialInput;
  const hasEnteredCredential = typeof credentialValue === 'string' && credentialValue !== '';
  useEffect(() => {
    if (otlpAuthTypeInput.value === OTLP_AUTH_TYPE_NONE && hasEnteredCredential) {
      cancelCredentialEdit();
    }
  }, [otlpAuthTypeInput.value, hasEnteredCredential, cancelCredentialEdit]);

  return {
    otlpAuthTypeInput,
    otlpAuthSchemeInput,
    otlpAuthHeaderNameInput,
    otlpAuthCredentialInput,
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
 * Validates every input, so all the errors are shown. Returns whether they are all valid. The
 * gRPC exporter sends the custom header as metadata, which allows fewer characters.
 */
export const validateOtlpAuthInputs = (inputs: OtlpAuthInputs, protocol: string): boolean => {
  if (!isOtlpAuthSelected(inputs)) {
    return true;
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

/**
 * Builds the authentication of the payload: `auth: null` removes a stored one with its credential.
 * A stored credential that was not edited is left out, so the update keeps it.
 */
export function buildOtlpAuth(
  inputs: OtlpAuthInputs,
  { hasStoredAuth }: { hasStoredAuth: boolean }
): Pick<NewOtlpOutput, 'auth' | 'secrets'> {
  if (!isOtlpAuthSelected(inputs)) {
    return hasStoredAuth ? { auth: null } : {};
  }

  const auth: OtlpOutputAuth =
    inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader
      ? { type: otlpAuthType.CustomHeader, name: inputs.otlpAuthHeaderNameInput.value.trim() }
      : {
          type: otlpAuthType.AuthHeader,
          scheme: inputs.otlpAuthSchemeInput.value as OtlpAuthScheme,
        };
  // a pasted value often ends with a line break, which would make the header invalid
  const credential = inputs.otlpAuthCredentialInput.value;
  const trimmedCredential = typeof credential === 'string' ? credential.trim() : '';

  return {
    auth,
    ...(trimmedCredential ? { secrets: { auth: { credential: trimmedCredential } } } : {}),
  };
}
