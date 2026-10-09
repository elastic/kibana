/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import type { KafkaOAuth2Config, KafkaOutput } from '../../../../../../../common/types/models';
import {
  kafkaOAuth2GrantType,
  kafkaOAuth2SignatureAlgorithm,
} from '../../../../../../../common/constants';

import {
  useComboInput,
  useInput,
  useKeyValueInput,
  useRadioInput,
  useSecretInput,
  useSwitchInput,
} from '../../../../hooks';

import {
  validateKafkaOAuth2Claims,
  validateKafkaOAuth2ClientCertificateKeySecret,
  validateKafkaOAuth2ClientId,
  validateKafkaOAuth2ClientSecretSecret,
  validateKafkaOAuth2EndpointParams,
  validateKafkaOAuth2TokenUrl,
} from './output_form_validators';

type OAuth2Secrets = NonNullable<NonNullable<KafkaOutput['secrets']>['oauth2']>;

/** The settings of the OAuth2 configuration that this form edits. */
const EDITED_OAUTH2_SETTINGS = [
  'grant_type',
  'client_id',
  'client_id_file',
  'client_secret_file',
  'token_url',
  'scopes',
  'endpoint_params',
  'tls',
  'client_certificate_key_id',
  'client_certificate_key_file',
  'signature_algorithm',
  'iss',
  'audience',
  'claims',
] as const;

const endpointParamsToRows = (
  params: KafkaOAuth2Config['endpoint_params']
): Array<{ key: string; value: string }> => {
  const rows = Object.entries(params ?? {}).flatMap(([key, values]) =>
    values.map((value) => ({ key, value }))
  );

  return rows.length ? rows : [{ key: '', value: '' }];
};

const hasValue = (value: string | undefined) => !!value?.trim();

/** The inputs of the OAuth2 authentication method of the Kafka output. */
export function useKafkaOAuth2Inputs(
  kafkaOutput: KafkaOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const config = kafkaOutput?.oauth2 ?? undefined;
  const secrets = kafkaOutput?.secrets?.oauth2;

  const kafkaOAuth2GrantTypeInput = useRadioInput(
    config?.grant_type ?? kafkaOAuth2GrantType.ClientCredentials,
    disabled
  );
  const isJwtBearer = kafkaOAuth2GrantTypeInput.value === kafkaOAuth2GrantType.JwtBearer;

  // Each secret can be replaced by the file of the agent host that holds it, and so is optional then
  const kafkaOAuth2ClientIdFileInput = useInput(config?.client_id_file, undefined, disabled);
  const kafkaOAuth2ClientSecretFileInput = useInput(
    config?.client_secret_file,
    undefined,
    disabled
  );
  const kafkaOAuth2ClientCertificateKeyFileInput = useInput(
    config?.client_certificate_key_file,
    undefined,
    disabled
  );

  const kafkaOAuth2ClientIdInput = useInput(
    config?.client_id,
    isSelected && !hasValue(kafkaOAuth2ClientIdFileInput.value)
      ? validateKafkaOAuth2ClientId
      : undefined,
    disabled
  );
  const kafkaOAuth2ClientSecretInput = useSecretInput(
    secrets?.client_secret,
    isSelected && !isJwtBearer && !hasValue(kafkaOAuth2ClientSecretFileInput.value)
      ? validateKafkaOAuth2ClientSecretSecret
      : undefined,
    disabled
  );
  const kafkaOAuth2ClientCertificateKeyInput = useSecretInput(
    secrets?.client_certificate_key,
    isSelected && isJwtBearer && !hasValue(kafkaOAuth2ClientCertificateKeyFileInput.value)
      ? validateKafkaOAuth2ClientCertificateKeySecret
      : undefined,
    disabled
  );
  const kafkaOAuth2TokenUrlInput = useInput(
    config?.token_url,
    isSelected ? validateKafkaOAuth2TokenUrl : undefined,
    disabled
  );
  const kafkaOAuth2ScopesInput = useComboInput(
    'kafkaOAuth2ScopesComboBox',
    config?.scopes ?? [],
    undefined,
    disabled
  );
  const kafkaOAuth2EndpointParamsInput = useKeyValueInput(
    'kafkaOAuth2EndpointParamsComboBox',
    endpointParamsToRows(config?.endpoint_params),
    isSelected ? validateKafkaOAuth2EndpointParams : undefined,
    disabled
  );

  // jwt-bearer grant only
  const kafkaOAuth2ClientCertificateKeyIdInput = useInput(
    config?.client_certificate_key_id,
    undefined,
    disabled
  );
  const kafkaOAuth2SignatureAlgorithmInput = useInput(
    config?.signature_algorithm ?? kafkaOAuth2SignatureAlgorithm.Rs256,
    undefined,
    disabled
  );
  const kafkaOAuth2IssInput = useInput(config?.iss, undefined, disabled);
  const kafkaOAuth2AudienceInput = useInput(config?.audience, undefined, disabled);
  const kafkaOAuth2ClaimsInput = useInput(
    config?.claims ? JSON.stringify(config.claims, null, 2) : undefined,
    isSelected && isJwtBearer ? validateKafkaOAuth2Claims : undefined,
    disabled
  );

  const kafkaOAuth2TlsCaFileInput = useInput(config?.tls?.ca_file, undefined, disabled);
  const kafkaOAuth2TlsCertFileInput = useInput(config?.tls?.cert_file, undefined, disabled);
  const kafkaOAuth2TlsKeyFileInput = useInput(config?.tls?.key_file, undefined, disabled);
  const kafkaOAuth2TlsServerNameOverrideInput = useInput(
    config?.tls?.server_name_override,
    undefined,
    disabled
  );
  const kafkaOAuth2TlsMinVersionInput = useInput(config?.tls?.min_version, undefined, disabled);
  const kafkaOAuth2TlsMaxVersionInput = useInput(config?.tls?.max_version, undefined, disabled);
  const kafkaOAuth2TlsInsecureSkipVerifyInput = useSwitchInput(
    config?.tls?.insecure_skip_verify ?? false,
    disabled
  );

  return {
    kafkaOAuth2GrantTypeInput,
    kafkaOAuth2ClientIdInput,
    kafkaOAuth2ClientIdFileInput,
    kafkaOAuth2ClientSecretInput,
    kafkaOAuth2ClientSecretFileInput,
    kafkaOAuth2ClientCertificateKeyInput,
    kafkaOAuth2ClientCertificateKeyFileInput,
    kafkaOAuth2ClientCertificateKeyIdInput,
    kafkaOAuth2SignatureAlgorithmInput,
    kafkaOAuth2IssInput,
    kafkaOAuth2AudienceInput,
    kafkaOAuth2ClaimsInput,
    kafkaOAuth2TokenUrlInput,
    kafkaOAuth2ScopesInput,
    kafkaOAuth2EndpointParamsInput,
    kafkaOAuth2TlsCaFileInput,
    kafkaOAuth2TlsCertFileInput,
    kafkaOAuth2TlsKeyFileInput,
    kafkaOAuth2TlsServerNameOverrideInput,
    kafkaOAuth2TlsMinVersionInput,
    kafkaOAuth2TlsMaxVersionInput,
    kafkaOAuth2TlsInsecureSkipVerifyInput,
  };
}

export type KafkaOAuth2Inputs = ReturnType<typeof useKafkaOAuth2Inputs>;

export const isKafkaOAuth2JwtBearer = (inputs: KafkaOAuth2Inputs) =>
  inputs.kafkaOAuth2GrantTypeInput.value === kafkaOAuth2GrantType.JwtBearer;

/** Validates every input, so all the errors are shown. Returns whether they are all valid. */
export const validateKafkaOAuth2Inputs = (inputs: KafkaOAuth2Inputs): boolean =>
  [
    inputs.kafkaOAuth2ClientIdInput.validate(),
    inputs.kafkaOAuth2ClientSecretInput.validate(),
    inputs.kafkaOAuth2ClientCertificateKeyInput.validate(),
    inputs.kafkaOAuth2TokenUrlInput.validate(),
    inputs.kafkaOAuth2EndpointParamsInput.validate(),
    inputs.kafkaOAuth2ClaimsInput.validate(),
  ].every(Boolean);

/** The secret of the grant in use: the client secret, or the private key of the jwt-bearer grant. */
export function extractKafkaOAuth2Secrets(inputs: KafkaOAuth2Inputs): OAuth2Secrets | undefined {
  const secret = isKafkaOAuth2JwtBearer(inputs)
    ? { client_certificate_key: inputs.kafkaOAuth2ClientCertificateKeyInput.value }
    : { client_secret: inputs.kafkaOAuth2ClientSecretInput.value };

  const [name, value] = Object.entries(secret)[0];

  return value ? ({ [name]: value } as OAuth2Secrets) : undefined;
}

/**
 * Builds the OAuth2 settings of the payload. The settings that this form does not edit are kept
 * as they are, or they would be lost when the output is saved.
 */
export function buildKafkaOAuth2Config(
  original: KafkaOAuth2Config | null | undefined,
  inputs: KafkaOAuth2Inputs
): KafkaOAuth2Config {
  const isJwtBearer = isKafkaOAuth2JwtBearer(inputs);
  const text = (input: { value?: string }) => input.value?.trim() || undefined;
  const defined = <T extends Record<string, unknown>>(settings: T) =>
    Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined)) as T;

  const scopes = inputs.kafkaOAuth2ScopesInput.value.map((scope) => scope.trim()).filter(Boolean);

  // every parameter of the token endpoint takes a list of values
  const endpointParams: Record<string, string[]> = {};
  inputs.kafkaOAuth2EndpointParamsInput.value.forEach(({ key, value }) => {
    if (key && value) {
      endpointParams[key] = [...(endpointParams[key] ?? []), value];
    }
  });

  const tls = defined({
    ca_file: text(inputs.kafkaOAuth2TlsCaFileInput),
    cert_file: text(inputs.kafkaOAuth2TlsCertFileInput),
    key_file: text(inputs.kafkaOAuth2TlsKeyFileInput),
    server_name_override: text(inputs.kafkaOAuth2TlsServerNameOverrideInput),
    min_version: text(inputs.kafkaOAuth2TlsMinVersionInput),
    max_version: text(inputs.kafkaOAuth2TlsMaxVersionInput),
    insecure_skip_verify: inputs.kafkaOAuth2TlsInsecureSkipVerifyInput.value ? true : undefined,
  });

  const claimsText = text(inputs.kafkaOAuth2ClaimsInput);
  const claims = claimsText ? JSON.parse(claimsText) : undefined;
  const signatureAlgorithm = inputs.kafkaOAuth2SignatureAlgorithmInput.value;

  return {
    ...omit(original ?? {}, EDITED_OAUTH2_SETTINGS),
    // the default grant is only sent when it was set before
    ...(isJwtBearer || original?.grant_type
      ? { grant_type: inputs.kafkaOAuth2GrantTypeInput.value as KafkaOAuth2Config['grant_type'] }
      : {}),
    ...defined({
      client_id: text(inputs.kafkaOAuth2ClientIdInput),
      client_id_file: text(inputs.kafkaOAuth2ClientIdFileInput),
    }),
    token_url: inputs.kafkaOAuth2TokenUrlInput.value.trim(),
    ...(scopes.length ? { scopes } : {}),
    ...(Object.keys(endpointParams).length ? { endpoint_params: endpointParams } : {}),
    ...(Object.keys(tls).length ? { tls } : {}),
    ...(isJwtBearer
      ? defined({
          client_certificate_key_file: text(inputs.kafkaOAuth2ClientCertificateKeyFileInput),
          client_certificate_key_id: text(inputs.kafkaOAuth2ClientCertificateKeyIdInput),
          // the default algorithm is only sent when it was set before
          signature_algorithm:
            signatureAlgorithm !== kafkaOAuth2SignatureAlgorithm.Rs256 ||
            original?.signature_algorithm
              ? (signatureAlgorithm as KafkaOAuth2Config['signature_algorithm'])
              : undefined,
          iss: text(inputs.kafkaOAuth2IssInput),
          audience: text(inputs.kafkaOAuth2AudienceInput),
          claims: claims && Object.keys(claims).length ? claims : undefined,
        })
      : defined({ client_secret_file: text(inputs.kafkaOAuth2ClientSecretFileInput) })),
  };
}
