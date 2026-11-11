/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BEATS_OUTPUT_TYPES, kafkaAuthType, outputType } from '../../../common/constants';
import type { OutputType, ValueOf } from '../../../common/types';
import type { SecretFieldDefinition } from '../secrets/preserve';

/**
 * The credentials an output of the given type can store as a secret, so that an update that does
 * not touch one of them keeps it (see `withSavedSecrets`).
 *
 * The secrets of the Kafka authentication methods are left out on purpose: `withSavedKafkaAuth`
 * keeps the settings and the secrets of the method of an output together. The TLS credentials of
 * an OTLP output have no plain text counterpart, they are only accepted under `secrets`: they are
 * removed with an explicit `null` of the credential, or by clearing the TLS settings they belong to
 * (`otlp_exporter.tls: null`, or `otlp_exporter.tls.tpm: null` for the TPM ones).
 */
export function getOutputSecretFields(type: ValueOf<OutputType>): SecretFieldDefinition[] {
  const fields: SecretFieldDefinition[] = [];

  if (BEATS_OUTPUT_TYPES.includes(type)) {
    fields.push({ secretPath: 'secrets.ssl.key', plainPath: 'ssl.key', clearedBy: ['ssl'] });
  }
  if (type === outputType.Kafka) {
    fields.push({
      secretPath: 'secrets.password',
      plainPath: 'password',
      clearedBy: ['password'],
      // the password belongs to user_pass: switching to another method without sending it drops it
      clearedWhen: (update) => {
        const { auth_type: authType } = update as { auth_type?: unknown };
        return authType !== undefined && authType !== kafkaAuthType.Userpass;
      },
    });
  }
  if (type === outputType.RemoteElasticsearch) {
    fields.push({
      secretPath: 'secrets.service_token',
      plainPath: 'service_token',
      clearedBy: ['service_token'],
    });
  }
  if (type === outputType.Otlp) {
    fields.push(
      { secretPath: 'secrets.otlp_exporter.tls.key_pem', clearedBy: ['otlp_exporter.tls'] },
      {
        secretPath: 'secrets.otlp_exporter.tls.tpm.owner_auth',
        clearedBy: ['otlp_exporter.tls', 'otlp_exporter.tls.tpm'],
      },
      {
        secretPath: 'secrets.otlp_exporter.tls.tpm.auth',
        clearedBy: ['otlp_exporter.tls', 'otlp_exporter.tls.tpm'],
      }
    );
  }

  return fields;
}
