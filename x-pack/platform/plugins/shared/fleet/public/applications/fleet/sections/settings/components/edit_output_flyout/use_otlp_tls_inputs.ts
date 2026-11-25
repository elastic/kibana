/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewOtlpOutput,
  OtlpExporterConfig,
  OtlpTlsCurvePreference,
  SOSecretOrNull,
} from '../../../../../../../common/types/models';

import { useComboInput, useInput, useSecretInput, useSwitchInput } from '../../../../hooks';

import type { OtlpTlsPairedErrors } from './output_form_validators';
import {
  validateOtlpDuration,
  validateOtlpShortString,
  validateOtlpTlsCipherSuites,
  validateOtlpTlsFilePath,
  validateOtlpTlsPairedSettings,
  validateOtlpTlsKeyPemSecret,
  validateOtlpTlsPem,
} from './output_form_validators';

type OtlpTlsConfig = NonNullable<OtlpExporterConfig['tls']>;

/** The TLS secrets of the payload: a new value, or `null` to remove a stored one. */
export interface OtlpTlsSecretsPayload {
  otlp_exporter: { tls: { key_pem: SOSecretOrNull } };
}

const toInputValue = (value: string | null | undefined) => value ?? '';

/** The inputs of the TLS settings of the OTLP exporter. */
export function useOtlpTlsInputs(
  otlpOutput: NewOtlpOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const tls = otlpOutput?.otlp_exporter?.tls ?? undefined;
  const validateIfSelected = <T>(validator: T) => (isSelected ? validator : undefined);

  // connection security
  const otlpTlsInsecureInput = useSwitchInput(tls?.insecure ?? false, disabled);
  const otlpTlsInsecureSkipVerifyInput = useSwitchInput(
    tls?.insecure_skip_verify ?? false,
    disabled
  );
  const otlpTlsServerNameOverrideInput = useInput(
    toInputValue(tls?.server_name_override),
    validateIfSelected(validateOtlpShortString),
    disabled
  );
  const otlpTlsIncludeSystemCaCertsPoolInput = useSwitchInput(
    tls?.include_system_ca_certs_pool ?? false,
    disabled
  );

  // certificate authority
  const otlpTlsCaPemInput = useInput(
    toInputValue(tls?.ca_pem),
    validateIfSelected(validateOtlpTlsPem),
    disabled
  );
  const otlpTlsCaFileInput = useInput(
    toInputValue(tls?.ca_file),
    validateIfSelected(validateOtlpTlsFilePath),
    disabled
  );

  // client certificate
  const otlpTlsCertPemInput = useInput(
    toInputValue(tls?.cert_pem),
    validateIfSelected(validateOtlpTlsPem),
    disabled
  );
  const otlpTlsCertFileInput = useInput(
    toInputValue(tls?.cert_file),
    validateIfSelected(validateOtlpTlsFilePath),
    disabled
  );
  const savedKeyPem = otlpOutput?.secrets?.otlp_exporter?.tls?.key_pem;
  // the saved key is removed with an explicit action, which sets the value to `undefined`
  const otlpTlsKeyPemInput = useSecretInput(
    savedKeyPem,
    validateIfSelected((value: string | { id: string } | undefined) =>
      validateOtlpTlsKeyPemSecret(value, !!savedKeyPem)
    ),
    disabled
  );
  const otlpTlsKeyFileInput = useInput(
    toInputValue(tls?.key_file),
    validateIfSelected(validateOtlpTlsFilePath),
    disabled
  );

  // protocol
  const otlpTlsMinVersionInput = useInput(toInputValue(tls?.min_version), undefined, disabled);
  const otlpTlsMaxVersionInput = useInput(toInputValue(tls?.max_version), undefined, disabled);
  const otlpTlsCipherSuitesInput = useComboInput(
    'otlpTlsCipherSuitesInput',
    tls?.cipher_suites ?? [],
    validateIfSelected(validateOtlpTlsCipherSuites),
    disabled
  );
  const otlpTlsIncludeInsecureCipherSuitesInput = useSwitchInput(
    tls?.include_insecure_cipher_suites ?? false,
    disabled
  );
  const otlpTlsCurvePreferencesInput = useComboInput(
    'otlpTlsCurvePreferencesInput',
    tls?.curve_preferences ?? [],
    undefined,
    disabled
  );
  const otlpTlsReloadIntervalInput = useInput(
    toInputValue(tls?.reload_interval),
    validateIfSelected(validateOtlpDuration),
    disabled
  );

  // trusted platform module
  const otlpTlsTpmEnabledInput = useSwitchInput(tls?.tpm?.enabled ?? false, disabled);
  const otlpTlsTpmPathInput = useInput(
    toInputValue(tls?.tpm?.path),
    validateIfSelected(validateOtlpTlsFilePath),
    disabled
  );

  return {
    otlpTlsInsecureInput,
    otlpTlsInsecureSkipVerifyInput,
    otlpTlsServerNameOverrideInput,
    otlpTlsIncludeSystemCaCertsPoolInput,
    otlpTlsCaPemInput,
    otlpTlsCaFileInput,
    otlpTlsCertPemInput,
    otlpTlsCertFileInput,
    otlpTlsKeyPemInput,
    otlpTlsKeyFileInput,
    otlpTlsMinVersionInput,
    otlpTlsMaxVersionInput,
    otlpTlsCipherSuitesInput,
    otlpTlsIncludeInsecureCipherSuitesInput,
    otlpTlsCurvePreferencesInput,
    otlpTlsReloadIntervalInput,
    otlpTlsTpmEnabledInput,
    otlpTlsTpmPathInput,
  };
}

export type OtlpTlsInputs = ReturnType<typeof useOtlpTlsInputs>;

const text = (input: { value?: string }) => input.value?.trim() || null;
const list = <T extends string>(input: { value: string[] }) =>
  input.value.length ? (input.value.map((value) => value.trim()) as T[]) : null;

/**
 * Whether the saved client key is removed: the Remove action sets the value to `undefined`, while
 * Replace sets it to a string.
 */
export const isOtlpTlsKeyPemRemoved = (inputs: OtlpTlsInputs): boolean =>
  !!inputs.otlpTlsKeyPemInput.formRowProps.initialValue &&
  inputs.otlpTlsKeyPemInput.value === undefined;

/**
 * Whether a client key is set as PEM: a new value, or a saved key that is kept. A saved key that
 * is being replaced still counts until it is removed: an empty replacement is an error of its own.
 */
const hasOtlpTlsKeyPem = (inputs: OtlpTlsInputs) => {
  const { value, formRowProps } = inputs.otlpTlsKeyPemInput;
  if (typeof value === 'string') {
    return !!value.trim() || !!formRowProps.initialValue;
  }
  return !!value;
};

const getOtlpTlsTextInputs = (inputs: OtlpTlsInputs) => [
  inputs.otlpTlsServerNameOverrideInput,
  inputs.otlpTlsCaPemInput,
  inputs.otlpTlsCaFileInput,
  inputs.otlpTlsCertPemInput,
  inputs.otlpTlsCertFileInput,
  inputs.otlpTlsKeyFileInput,
  inputs.otlpTlsMinVersionInput,
  inputs.otlpTlsMaxVersionInput,
  inputs.otlpTlsReloadIntervalInput,
  inputs.otlpTlsTpmPathInput,
];

const getOtlpTlsSwitchInputs = (inputs: OtlpTlsInputs) => [
  inputs.otlpTlsInsecureInput,
  inputs.otlpTlsInsecureSkipVerifyInput,
  inputs.otlpTlsIncludeSystemCaCertsPoolInput,
  inputs.otlpTlsIncludeInsecureCipherSuitesInput,
  inputs.otlpTlsTpmEnabledInput,
];

/** Whether a TLS setting is set, other than to its default. */
export const hasOtlpTlsSettings = (inputs: OtlpTlsInputs): boolean =>
  getOtlpTlsTextInputs(inputs).some((input) => !!input.value.trim()) ||
  getOtlpTlsSwitchInputs(inputs).some((input) => input.value) ||
  inputs.otlpTlsCipherSuitesInput.value.length > 0 ||
  inputs.otlpTlsCurvePreferencesInput.value.length > 0 ||
  hasOtlpTlsKeyPem(inputs);

/**
 * The errors of the TLS settings that depend on each other. They are derived from the current
 * values rather than stored, so that changing one setting of a pair updates the error of the other.
 */
export const getOtlpTlsPairedErrors = (inputs: OtlpTlsInputs): OtlpTlsPairedErrors =>
  validateOtlpTlsPairedSettings({
    caPem: inputs.otlpTlsCaPemInput.value,
    caFile: inputs.otlpTlsCaFileInput.value,
    certPem: inputs.otlpTlsCertPemInput.value,
    certFile: inputs.otlpTlsCertFileInput.value,
    hasKeyPem: hasOtlpTlsKeyPem(inputs),
    keyFile: inputs.otlpTlsKeyFileInput.value,
    minVersion: inputs.otlpTlsMinVersionInput.value,
    maxVersion: inputs.otlpTlsMaxVersionInput.value,
  });

export const hasOtlpTlsPairedErrors = (inputs: OtlpTlsInputs): boolean =>
  Object.keys(getOtlpTlsPairedErrors(inputs)).length > 0;

/** Validates every input, so all the errors are shown. Returns whether they are all valid. */
export const validateOtlpTlsInputs = (inputs: OtlpTlsInputs): boolean =>
  [
    ...[
      inputs.otlpTlsServerNameOverrideInput,
      inputs.otlpTlsCaPemInput,
      inputs.otlpTlsCaFileInput,
      inputs.otlpTlsCertPemInput,
      inputs.otlpTlsCertFileInput,
      inputs.otlpTlsKeyPemInput,
      inputs.otlpTlsKeyFileInput,
      inputs.otlpTlsCipherSuitesInput,
      inputs.otlpTlsReloadIntervalInput,
      inputs.otlpTlsTpmPathInput,
    ].map((input) => input.validate()),
    !hasOtlpTlsPairedErrors(inputs),
  ].every(Boolean);

/**
 * Builds the `tls` of the exporter. An update is deep merged into the stored output, so a cleared
 * setting is sent as `null`, and `tls: null` removes all the stored settings with their secrets.
 * Without TLS settings, `tls` is left out unless there are stored ones to remove.
 *
 * The TPM secrets can only be set with the API. While the output has some, neither `tls` nor
 * `tpm` is sent as `null`, which would remove them: the settings are cleared one by one instead.
 */
export function buildOtlpTls(
  inputs: OtlpTlsInputs,
  { hasStoredTls, hasStoredTpmSecrets }: { hasStoredTls: boolean; hasStoredTpmSecrets: boolean }
): OtlpTlsConfig | null | undefined {
  if (!hasOtlpTlsSettings(inputs) && !hasStoredTpmSecrets) {
    return hasStoredTls ? null : undefined;
  }

  const tpmPath = text(inputs.otlpTlsTpmPathInput);
  const tpmEnabled = inputs.otlpTlsTpmEnabledInput.value;

  return {
    insecure: inputs.otlpTlsInsecureInput.value,
    insecure_skip_verify: inputs.otlpTlsInsecureSkipVerifyInput.value,
    server_name_override: text(inputs.otlpTlsServerNameOverrideInput),
    include_system_ca_certs_pool: inputs.otlpTlsIncludeSystemCaCertsPoolInput.value,
    ca_pem: text(inputs.otlpTlsCaPemInput),
    ca_file: text(inputs.otlpTlsCaFileInput),
    cert_pem: text(inputs.otlpTlsCertPemInput),
    cert_file: text(inputs.otlpTlsCertFileInput),
    key_file: text(inputs.otlpTlsKeyFileInput),
    min_version: text(inputs.otlpTlsMinVersionInput),
    max_version: text(inputs.otlpTlsMaxVersionInput),
    cipher_suites: list(inputs.otlpTlsCipherSuitesInput),
    include_insecure_cipher_suites: inputs.otlpTlsIncludeInsecureCipherSuitesInput.value,
    curve_preferences: list<OtlpTlsCurvePreference>(inputs.otlpTlsCurvePreferencesInput),
    reload_interval: text(inputs.otlpTlsReloadIntervalInput),
    tpm:
      tpmEnabled || tpmPath || hasStoredTpmSecrets ? { enabled: tpmEnabled, path: tpmPath } : null,
  };
}

/**
 * Builds the TLS secrets of the payload. A new client key is sent as a value. A stored key that
 * was not edited, or whose replacement is empty (which validation rejects), is left out, so the
 * update keeps it. A stored key that was removed is sent as `null`.
 */
export function buildOtlpTlsSecrets(
  inputs: OtlpTlsInputs,
  { hasStoredKeyPem }: { hasStoredKeyPem: boolean }
): OtlpTlsSecretsPayload | undefined {
  const { value } = inputs.otlpTlsKeyPemInput;
  if (typeof value === 'string' && value.trim()) {
    return { otlp_exporter: { tls: { key_pem: value.trim() } } };
  }
  return hasStoredKeyPem && value === undefined
    ? { otlp_exporter: { tls: { key_pem: null } } }
    : undefined;
}
