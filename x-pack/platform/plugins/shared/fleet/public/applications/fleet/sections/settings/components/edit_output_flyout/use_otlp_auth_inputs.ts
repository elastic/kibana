/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewOtlpOutput,
  OtlpAuthScheme,
  OtlpOutputAuth,
} from '../../../../../../../common/types/models';
import { otlpAuthScheme, otlpAuthType } from '../../../../../../../common/constants';

import { isManagedOtlpEndpointUrl } from '../../../../../../../common/services/managed_otlp_endpoint';

import { useInput, useSecretInput } from '../../../../hooks';

import {
  validateOtlpAuthCredentialSecret,
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

  return {
    otlpAuthTypeInput,
    otlpAuthSchemeInput,
    otlpAuthHeaderNameInput,
    otlpAuthCredentialInput,
  };
}

export type OtlpAuthInputs = ReturnType<typeof useOtlpAuthInputs>;

/** The managed OTLP endpoint is authenticated by Fleet: an output that uses it has no authentication. */
export const isOtlpAuthAvailable = (endpoint: string, managedOtlpUrl: string | undefined) =>
  !isManagedOtlpEndpointUrl(endpoint.trim(), managedOtlpUrl);

export const isOtlpAuthSelected = (inputs: OtlpAuthInputs) =>
  inputs.otlpAuthTypeInput.value !== OTLP_AUTH_TYPE_NONE;

/** Validates every input, so all the errors are shown. Returns whether they are all valid. */
export const validateOtlpAuthInputs = (inputs: OtlpAuthInputs): boolean =>
  !isOtlpAuthSelected(inputs) ||
  [inputs.otlpAuthHeaderNameInput.validate(), inputs.otlpAuthCredentialInput.validate()].every(
    Boolean
  );

/**
 * Builds the authentication of the payload: `auth: null` removes a stored one with its credential.
 * A stored credential that was not edited is left out, so the update keeps it.
 */
export function buildOtlpAuth(
  inputs: OtlpAuthInputs,
  { enabled, hasStoredAuth }: { enabled: boolean; hasStoredAuth: boolean }
): Pick<NewOtlpOutput, 'auth' | 'secrets'> {
  if (!enabled || !isOtlpAuthSelected(inputs)) {
    return hasStoredAuth ? { auth: null } : {};
  }

  const auth: OtlpOutputAuth =
    inputs.otlpAuthTypeInput.value === otlpAuthType.CustomHeader
      ? { type: otlpAuthType.CustomHeader, name: inputs.otlpAuthHeaderNameInput.value.trim() }
      : {
          type: otlpAuthType.AuthHeader,
          scheme: inputs.otlpAuthSchemeInput.value as OtlpAuthScheme,
        };
  const credential = inputs.otlpAuthCredentialInput.value;

  return {
    auth,
    ...(typeof credential === 'string' && credential ? { secrets: { auth: { credential } } } : {}),
  };
}
