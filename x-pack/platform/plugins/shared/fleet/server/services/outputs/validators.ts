/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { isBeatsOutput } from '../../../common/services/output_helpers';
import {
  kafkaAuthType,
  kafkaKerberosAuthType,
  kafkaOAuth2GrantType,
  outputType,
} from '../../../common/constants';
import { SERVERLESS_DEFAULT_OUTPUT_ID, SERVERLESS_PRIVATE_OUTPUT_ID } from '../../constants';
import type { NewBeatsOutput, UpdateTypedOutput } from '../../../common/types';
import type { NewOutput } from '../../../common';
import type { Output } from '../../types';
import type { KafkaAuthMethod } from './kafka_auth';
import { OutputInvalidError } from '../../errors';
import { appContextService } from '../app_context';
import { throwIfSslPathInvalid } from '../../routes/utils/ssl_utils';

export const validateOutputSslPaths = (output: Partial<NewBeatsOutput>): void => {
  throwIfSslPathInvalid(
    [
      ...(output.ssl?.certificate_authorities ?? []),
      output.ssl?.certificate,
      output.ssl?.key,
      output.secrets?.ssl?.key,
    ],
    (m) => new OutputInvalidError(m)
  );
};

/**
 * Checks the settings the OAuth2 authentication method of a Kafka output needs, as the
 * `oauth2clientauthextension` of the collector does: an id, a secret (or a private key for the
 * jwt-bearer grant) and a token URL.
 */
export const validateKafkaOAuth2 = (output: UpdateTypedOutput | NewOutput): void => {
  if (output.type !== outputType.Kafka || output.auth_type !== kafkaAuthType.OAuth2) {
    return;
  }

  const { oauth2, secrets } = output;
  if (!oauth2) {
    throw new OutputInvalidError('oauth2 is required when auth_type is oauth2');
  }
  if (!oauth2.client_id && !oauth2.client_id_file) {
    throw new OutputInvalidError('oauth2.client_id or oauth2.client_id_file is required');
  }

  if (oauth2.grant_type === kafkaOAuth2GrantType.JwtBearer) {
    if (!secrets?.oauth2?.client_certificate_key && !oauth2.client_certificate_key_file) {
      throw new OutputInvalidError(
        'secrets.oauth2.client_certificate_key or oauth2.client_certificate_key_file is required for the jwt-bearer grant'
      );
    }
  } else if (!secrets?.oauth2?.client_secret && !oauth2.client_secret_file) {
    throw new OutputInvalidError(
      'secrets.oauth2.client_secret or oauth2.client_secret_file is required'
    );
  }
};

/**
 * Checks the settings the Kerberos authentication method of a Kafka output needs, as the Kafka
 * output of Beats does: the path of the Kerberos configuration and a realm, a keytab for the keytab
 * authentication, or a username and a password for the password authentication.
 */
export const validateKafkaKerberos = (output: UpdateTypedOutput | NewOutput): void => {
  if (output.type !== outputType.Kafka || output.auth_type !== kafkaAuthType.Kerberos) {
    return;
  }

  const { kerberos, secrets } = output;
  if (!kerberos) {
    throw new OutputInvalidError('kerberos is required when auth_type is kerberos');
  }
  if (!kerberos.config_path) {
    throw new OutputInvalidError('kerberos.config_path is required');
  }
  if (!kerberos.realm) {
    throw new OutputInvalidError('kerberos.realm is required');
  }

  if (kerberos.auth_type === kafkaKerberosAuthType.Keytab) {
    if (!kerberos.keytab) {
      throw new OutputInvalidError('kerberos.keytab is required when kerberos.auth_type is keytab');
    }
  } else {
    if (!kerberos.username) {
      throw new OutputInvalidError(
        'kerberos.username is required when kerberos.auth_type is password'
      );
    }
    if (!secrets?.kerberos?.password) {
      throw new OutputInvalidError(
        'secrets.kerberos.password is required when kerberos.auth_type is password'
      );
    }
  }
};

/**
 * Checks the settings of every authentication method of the Kafka output, but those of the methods
 * in `keptMethods`: an update that keeps the authentication of an output as it is does not need to
 * have it checked again, e.g. an output with the kerberos type that was saved without settings.
 */
export const validateKafkaAuthMethods = (
  output: UpdateTypedOutput | NewOutput,
  keptMethods: KafkaAuthMethod[] = []
): void => {
  if (!keptMethods.includes('oauth2')) {
    validateKafkaOAuth2(output);
  }
  if (!keptMethods.includes('kerberos')) {
    validateKafkaKerberos(output);
  }
};

export const ensureNoDuplicateSecrets = (output: UpdateTypedOutput | NewOutput): void => {
  if (output.type === outputType.Kafka && output?.password && output?.secrets?.password) {
    throw new OutputInvalidError('Cannot specify both password and secrets.password');
  }
  if (isBeatsOutput(output) && output.ssl?.key && output.secrets?.ssl?.key) {
    throw new OutputInvalidError('Cannot specify both ssl.key and secrets.ssl.key');
  }
  if (
    output.type === outputType.RemoteElasticsearch &&
    output.service_token &&
    output.secrets?.service_token
  ) {
    throw new OutputInvalidError('Cannot specify both service_token and secrets.service_token');
  }
};

export const validateOutputServerless = async (
  outputSvc: { get(id: string): Promise<Output> },
  output: UpdateTypedOutput | NewOutput,
  outputId?: string
): Promise<void> => {
  const cloudSetup = appContextService.getCloud();
  if (!cloudSetup?.isServerlessEnabled) {
    return;
  }
  // On update, skip serverless host check if hosts are not being changed.
  if (outputId && !('hosts' in output)) {
    return;
  }
  // Preconfigured outputs in serverless are authoritative.
  if ('is_preconfigured' in output && output.is_preconfigured) {
    return;
  }
  let originalOutput: Output | undefined;
  if (outputId) {
    originalOutput = await outputSvc.get(outputId);
    if (originalOutput.is_preconfigured) {
      return;
    }
  }
  const type = output.type || originalOutput?.type;
  if (type !== outputType.Elasticsearch) {
    return;
  }
  if (!('hosts' in output)) {
    return;
  }
  let defaultOutput: Output;
  try {
    defaultOutput = await outputSvc.get(SERVERLESS_DEFAULT_OUTPUT_ID);
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw e;
    }
    appContextService.getLogger().debug(`Default ES output SO not found: ${e?.message ?? e}`);
    return;
  }
  if (defaultOutput.type !== outputType.Elasticsearch) {
    return;
  }
  if (deepEqual(output.hosts, defaultOutput.hosts)) {
    return;
  }
  try {
    const privateOutput = await outputSvc.get(SERVERLESS_PRIVATE_OUTPUT_ID);
    if (
      privateOutput.type === outputType.Elasticsearch &&
      deepEqual(output.hosts, privateOutput.hosts) &&
      outputId === SERVERLESS_PRIVATE_OUTPUT_ID
    ) {
      return;
    }
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw e;
    }
    appContextService.getLogger().debug(`Private ES output SO not found: ${e?.message ?? e}`);
  }
  throw new OutputInvalidError(
    `Elasticsearch output host must have default URL in serverless: ${defaultOutput.hosts}`
  );
};
