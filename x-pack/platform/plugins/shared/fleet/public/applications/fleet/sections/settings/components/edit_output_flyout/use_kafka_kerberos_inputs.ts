/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import type { KafkaKerberosConfig, KafkaOutput } from '../../../../../../../common/types/models';
import { kafkaAuthType, kafkaKerberosAuthType } from '../../../../../../../common/constants';

import { useInput, useRadioInput, useSecretInput, useSwitchInput } from '../../../../hooks';

import {
  validateKafkaKerberosConfigPath,
  validateKafkaKerberosKeytab,
  validateKafkaKerberosPasswordSecret,
  validateKafkaKerberosRealm,
  validateKafkaKerberosUsername,
} from './output_form_validators';

type KerberosSecrets = NonNullable<NonNullable<KafkaOutput['secrets']>['kerberos']>;

/** The settings of the Kerberos configuration that this form edits. */
const EDITED_KERBEROS_SETTINGS = [
  'auth_type',
  'config_path',
  'keytab',
  'username',
  'service_name',
  'realm',
  'enable_krb5_fast',
] as const;

/** The inputs of the Kerberos authentication method of the Kafka output. */
export function useKafkaKerberosInputs(
  kafkaOutput: KafkaOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const config = kafkaOutput?.kerberos ?? undefined;
  const secrets = kafkaOutput?.secrets?.kerberos;

  const kafkaKerberosAuthTypeInput = useRadioInput(
    config?.auth_type ?? kafkaKerberosAuthType.Keytab,
    disabled
  );
  const isPassword = kafkaKerberosAuthTypeInput.value === kafkaKerberosAuthType.Password;

  const kafkaKerberosConfigPathInput = useInput(
    config?.config_path,
    isSelected ? validateKafkaKerberosConfigPath : undefined,
    disabled
  );
  const kafkaKerberosRealmInput = useInput(
    config?.realm,
    isSelected ? validateKafkaKerberosRealm : undefined,
    disabled
  );
  const kafkaKerberosServiceNameInput = useInput(config?.service_name, undefined, disabled);
  const kafkaKerberosEnableFastInput = useSwitchInput(config?.enable_krb5_fast ?? false, disabled);

  const kafkaKerberosKeytabInput = useInput(
    config?.keytab,
    isSelected && !isPassword ? validateKafkaKerberosKeytab : undefined,
    disabled
  );
  const kafkaKerberosUsernameInput = useInput(
    config?.username,
    isSelected && isPassword ? validateKafkaKerberosUsername : undefined,
    disabled
  );
  const kafkaKerberosPasswordInput = useSecretInput(
    secrets?.password,
    isSelected && isPassword ? validateKafkaKerberosPasswordSecret : undefined,
    disabled
  );

  return {
    kafkaKerberosAuthTypeInput,
    kafkaKerberosConfigPathInput,
    kafkaKerberosRealmInput,
    kafkaKerberosServiceNameInput,
    kafkaKerberosEnableFastInput,
    kafkaKerberosKeytabInput,
    kafkaKerberosUsernameInput,
    kafkaKerberosPasswordInput,
  };
}

export type KafkaKerberosInputs = ReturnType<typeof useKafkaKerberosInputs>;

export const isKafkaKerberosPassword = (inputs: KafkaKerberosInputs) =>
  inputs.kafkaKerberosAuthTypeInput.value === kafkaKerberosAuthType.Password;

/** Validates every input, so all the errors are shown. Returns whether they are all valid. */
export const validateKafkaKerberosInputs = (inputs: KafkaKerberosInputs): boolean =>
  [
    inputs.kafkaKerberosConfigPathInput.validate(),
    inputs.kafkaKerberosRealmInput.validate(),
    inputs.kafkaKerberosKeytabInput.validate(),
    inputs.kafkaKerberosUsernameInput.validate(),
    inputs.kafkaKerberosPasswordInput.validate(),
  ].every(Boolean);

/** The password, only for the password authentication. */
export function extractKafkaKerberosSecrets(
  inputs: KafkaKerberosInputs
): KerberosSecrets | undefined {
  const password = inputs.kafkaKerberosPasswordInput.value;

  return isKafkaKerberosPassword(inputs) && password ? { password } : undefined;
}

/**
 * Builds the Kerberos settings of the payload. The keytab is only sent for the keytab
 * authentication, and the username for the password one. Settings this form does not edit are
 * kept as they are.
 */
export function buildKafkaKerberosConfig(
  original: KafkaKerberosConfig | null | undefined,
  inputs: KafkaKerberosInputs
): KafkaKerberosConfig {
  const isPassword = isKafkaKerberosPassword(inputs);
  const text = (input: { value?: string }) => input.value?.trim() || undefined;
  const defined = <T extends Record<string, unknown>>(settings: T) =>
    Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined)) as T;

  return {
    ...omit(original ?? {}, EDITED_KERBEROS_SETTINGS),
    auth_type: inputs.kafkaKerberosAuthTypeInput.value as KafkaKerberosConfig['auth_type'],
    config_path: inputs.kafkaKerberosConfigPathInput.value.trim(),
    realm: inputs.kafkaKerberosRealmInput.value.trim(),
    ...defined({
      service_name: text(inputs.kafkaKerberosServiceNameInput),
      ...(isPassword
        ? { username: text(inputs.kafkaKerberosUsernameInput) }
        : { keytab: text(inputs.kafkaKerberosKeytabInput) }),
    }),
    // the default is only sent when it was set before
    ...(inputs.kafkaKerberosEnableFastInput.value || original?.enable_krb5_fast !== undefined
      ? { enable_krb5_fast: inputs.kafkaKerberosEnableFastInput.value }
      : {}),
  };
}

/** Whether the output has the kerberos type and no settings, e.g. one set up in the advanced YAML. */
export const isKafkaKerberosWithoutSettings = (output: KafkaOutput | undefined) =>
  output?.auth_type === kafkaAuthType.Kerberos && !output.kerberos;

/** Whether a Kerberos setting was entered in the form. */
export const hasKafkaKerberosInput = (inputs: KafkaKerberosInputs) =>
  [
    inputs.kafkaKerberosConfigPathInput,
    inputs.kafkaKerberosRealmInput,
    inputs.kafkaKerberosServiceNameInput,
    inputs.kafkaKerberosKeytabInput,
    inputs.kafkaKerberosUsernameInput,
  ].some((input) => !!input.value?.trim()) ||
  !!inputs.kafkaKerberosPasswordInput.value ||
  inputs.kafkaKerberosEnableFastInput.value;
