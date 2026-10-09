/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kafkaAuthType } from '../../../common/constants';
import type { KafkaOutput, ValueOf } from '../../../common/types';

type KafkaAuthTypeValue = ValueOf<typeof kafkaAuthType>;

/**
 * Output fields that only make sense for one `auth_type`. They are cleared when the output uses any
 * other `auth_type`, including an `auth_type` that owns no field and so has no entry. A new
 * authentication method registers the fields it owns here.
 */
const KAFKA_AUTH_TYPE_OWNED_FIELDS: Partial<Record<KafkaAuthTypeValue, string[]>> = {
  [kafkaAuthType.None]: ['connection_type'],
  [kafkaAuthType.Userpass]: ['username', 'password'],
};

/**
 * Clears the fields owned by an `auth_type` other than the given one.
 *
 * `emptyValue` is `undefined` when creating an output (the field is left out of the saved object)
 * and `null` when updating one (the field is explicitly removed).
 */
export function clearKafkaAuthFieldsForType(
  data: object,
  authType: KafkaOutput['auth_type'],
  emptyValue: undefined | null
): void {
  const target = data as Record<string, unknown>;

  Object.entries(KAFKA_AUTH_TYPE_OWNED_FIELDS).forEach(([ownerAuthType, ownedFields]) => {
    if (authType === ownerAuthType) {
      return;
    }
    ownedFields.forEach((field) => {
      target[field] = emptyValue;
    });
  });
}

/**
 * Builds the authentication part of the Kafka output sent to the agent. A new authentication
 * method adds the keys it needs here.
 */
export function buildKafkaAuthData(
  output: Pick<KafkaOutput, 'auth_type' | 'username' | 'password' | 'sasl'>
): Record<string, unknown> {
  const { username, password, sasl } = output;

  return {
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(sasl ? { sasl } : {}),
  };
}
