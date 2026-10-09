/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isPlainObject } from 'lodash';

import { KAFKA_OAUTHBEARER_SASL_MECHANISM, kafkaAuthType } from '../../../common/constants';
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
  [kafkaAuthType.OAuth2]: ['oauth2'],
};

/**
 * Output fields cleared when the output uses the given `auth_type`, because they do not apply to
 * it. They are kept for the other types, as the agent ignores them there.
 */
const KAFKA_AUTH_TYPE_CLEARED_FIELDS: Partial<Record<KafkaAuthTypeValue, string[]>> = {
  [kafkaAuthType.OAuth2]: ['sasl'],
};

/**
 * Secrets, under `secrets`, that only make sense for one `auth_type`.
 * `secrets.password` is not listed on purpose: it is kept for every `auth_type`, as before.
 */
const KAFKA_AUTH_TYPE_OWNED_SECRETS: Partial<Record<KafkaAuthTypeValue, string[]>> = {
  [kafkaAuthType.OAuth2]: ['oauth2'],
};

/**
 * Clears the fields owned by an `auth_type` other than the given one, and the fields that do not
 * apply to the given one.
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

  (KAFKA_AUTH_TYPE_CLEARED_FIELDS[authType as KafkaAuthTypeValue] ?? []).forEach((field) => {
    target[field] = emptyValue;
  });
}

/**
 * Returns the secrets of an output without the ones owned by an `auth_type` other than the given
 * one, so they are not stored for it.
 */
export function omitKafkaSecretsOfOtherAuthTypes<T extends object>(
  secrets: T | undefined,
  authType: KafkaOutput['auth_type']
): T | undefined {
  if (!secrets) {
    return secrets;
  }
  const kept = { ...secrets } as Record<string, unknown>;
  Object.entries(KAFKA_AUTH_TYPE_OWNED_SECRETS).forEach(([ownerAuthType, ownedSecrets]) => {
    if (authType !== ownerAuthType) {
      ownedSecrets.forEach((secret) => delete kept[secret]);
    }
  });

  return kept as T;
}

/** Whether an output payload sets anything of the OAuth2 authentication method. */
export function usesKafkaOAuth2(output: {
  type?: string;
  auth_type?: string | null;
  oauth2?: unknown;
  secrets?: unknown;
}): boolean {
  return (
    output.type === 'kafka' &&
    (output.auth_type === kafkaAuthType.OAuth2 ||
      !isEmpty(output.oauth2) ||
      !isEmpty((output.secrets as { oauth2?: unknown } | undefined)?.oauth2))
  );
}

/** Removes the unset (null, undefined, empty) settings, so they are not sent to the agent. */
const pruneEmpty = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length ? value : undefined;
  }
  if (isPlainObject(value)) {
    const pruned = Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => [key, pruneEmpty(nested)])
        .filter(([, nested]) => nested !== undefined)
    );
    return isEmpty(pruned) ? undefined : pruned;
  }
  return value === null || value === '' ? undefined : value;
};

/**
 * Builds the authentication part of the Kafka output sent to the agent. A new authentication
 * method adds the keys it needs here.
 */
export function buildKafkaAuthData(
  output: Pick<KafkaOutput, 'auth_type' | 'username' | 'password' | 'sasl' | 'oauth2'>
): Record<string, unknown> {
  const { username, password, sasl, oauth2 } = output;

  if (output.auth_type === kafkaAuthType.OAuth2) {
    // the settings follow the `oauth2clientauthextension` of the collector, as the agent expects
    return {
      sasl: { mechanism: KAFKA_OAUTHBEARER_SASL_MECHANISM },
      auth: { oauth2client: pruneEmpty(oauth2) ?? {} },
    };
  }

  return {
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(sasl ? { sasl } : {}),
  };
}

/**
 * Returns the secrets of the Kafka output sent to the agent, placed where the agent expects the
 * setting each one replaces: Fleet Server writes the value of `secrets.<path>` at `<path>`.
 */
export function buildKafkaSecrets(
  output: Pick<KafkaOutput, 'auth_type' | 'secrets'>
): KafkaOutput['secrets'] | Record<string, unknown> | undefined {
  const { secrets } = output;

  if (!secrets || output.auth_type !== kafkaAuthType.OAuth2) {
    return secrets;
  }

  const { oauth2, ...otherSecrets } = secrets;
  const oauth2clientSecrets = pruneEmpty(oauth2);
  const remapped = {
    ...otherSecrets,
    ...(oauth2clientSecrets ? { auth: { oauth2client: oauth2clientSecrets } } : {}),
  };

  return isEmpty(remapped) ? undefined : remapped;
}
