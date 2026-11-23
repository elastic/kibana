/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kafkaAuthType, outputType } from '../../../common/constants';
import type { OutputType, ValueOf } from '../../../common/types';
import type { SecretFieldDefinition } from '../secrets/preserve';

/**
 * The credentials an output of the given type can store as a secret, so that an update that does
 * not touch one of them keeps it (see `withSavedSecrets`).
 */
export function getOutputSecretFields(type: ValueOf<OutputType>): SecretFieldDefinition[] {
  const fields: SecretFieldDefinition[] = [
    { secretPath: 'secrets.ssl.key', plainPath: 'ssl.key', clearedBy: ['ssl'] },
  ];

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

  return fields;
}
