/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, isPlainObject } from 'lodash';

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

/**
 * The saved object update merges objects: a secret that is no longer sent is deleted, but its
 * reference stays in the output unless it is explicitly set to `null`. Returns those `null`s for
 * the OAuth2 secrets that the output has and the update does not keep (`undefined` if none).
 */
export function getRemovedKafkaOAuth2Secrets(
  original: { type?: string; secrets?: unknown },
  updatedSecrets: unknown
): Record<string, null> | undefined {
  const savedOAuth2 = (original.secrets as { oauth2?: Record<string, unknown> } | undefined)
    ?.oauth2;
  if (original.type !== 'kafka' || !savedOAuth2) {
    return undefined;
  }

  const keptOAuth2 = (updatedSecrets as { oauth2?: Record<string, unknown> } | undefined)?.oauth2;
  const removed = Object.keys(savedOAuth2).filter((key) => savedOAuth2[key] && !keptOAuth2?.[key]);

  return removed.length ? Object.fromEntries(removed.map((key) => [key, null])) : undefined;
}

interface SavedKafkaOutput {
  type?: string;
  auth_type?: string | null;
  oauth2?: unknown;
  secrets?: unknown;
}

const savedOAuth2Secrets = (output: SavedKafkaOutput): Record<string, unknown> | undefined =>
  (output.secrets as { oauth2?: Record<string, unknown> } | undefined)?.oauth2;

/**
 * An update that does not name an `auth_type` leaves the authentication of the output as it is. For
 * an output that uses OAuth2, the settings and secrets the update does not send are the saved
 * ones, so that renaming the output, for example, does not remove them.
 */
export function withSavedKafkaOAuth2<T extends object>(original: SavedKafkaOutput, update: T): T {
  const sent = update as { auth_type?: unknown; oauth2?: unknown; secrets?: { oauth2?: unknown } };
  if (original.type !== 'kafka' || original.auth_type !== kafkaAuthType.OAuth2) {
    return update;
  }
  if (sent.auth_type !== undefined) {
    return update;
  }

  const secrets = savedOAuth2Secrets(original);

  return {
    ...update,
    ...(sent.oauth2 === undefined && original.oauth2 ? { oauth2: original.oauth2 } : {}),
    ...(!sent.secrets?.oauth2 && secrets ? { secrets: { ...sent.secrets, oauth2: secrets } } : {}),
  };
}

/**
 * Whether an update keeps the OAuth2 authentication of an output exactly as it is: the same
 * settings, and the saved secrets sent back as references. Such an update does not need OAuth2 to
 * be allowed, it is an ordinary edit of the output.
 */
export function keepsKafkaOAuth2(
  original: SavedKafkaOutput,
  update: { type?: string; auth_type?: string | null; oauth2?: unknown; secrets?: unknown }
): boolean {
  if (original.type !== 'kafka' || original.auth_type !== kafkaAuthType.OAuth2) {
    return false;
  }
  if (
    (update.type !== undefined && update.type !== 'kafka') ||
    (update.auth_type !== undefined && update.auth_type !== kafkaAuthType.OAuth2)
  ) {
    return false;
  }
  if (!isEqual(update.oauth2 ?? original.oauth2, original.oauth2)) {
    return false;
  }

  const saved = savedOAuth2Secrets(original) ?? {};
  const sent =
    (update.secrets as { oauth2?: Record<string, unknown> } | undefined)?.oauth2 ?? saved;
  const isSavedReference = (key: string) =>
    isPlainObject(sent[key]) &&
    (sent[key] as { id?: string }).id === (saved[key] as { id?: string } | undefined)?.id;

  return (
    Object.keys(sent).every(isSavedReference) && Object.keys(saved).every((key) => key in sent)
  );
}

// The names of some settings, e.g. an endpoint parameter, are chosen by the user. Everything below
// reads and writes own properties only: a name such as `__proto__` or `constructor` is a name like
// any other, not the property every object inherits.
const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

const getOwn = (object: object, key: string): unknown =>
  hasOwn(object, key) ? (object as Record<string, unknown>)[key] : undefined;

const nullsForRemovedSettings = (original: unknown, updated: unknown) => {
  if (!isPlainObject(original)) {
    return undefined;
  }
  const kept = isPlainObject(updated) ? (updated as object) : {};
  const removed: Array<[string, unknown]> = [];

  Object.entries(original as Record<string, unknown>).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    const keptValue = getOwn(kept, key);
    if (keptValue === undefined) {
      removed.push([key, null]);
    } else if (isPlainObject(value) && isPlainObject(keptValue)) {
      const nested = nullsForRemovedSettings(value, keptValue);
      if (nested) {
        removed.push([key, nested]);
      }
    }
  });

  return removed.length ? Object.fromEntries(removed) : undefined;
};

/** Deep merge of plain objects in which `override` wins, that keeps every own property. */
const mergeSettings = (base: object, override: object): Record<string, unknown> => {
  const keys = new Set([...Object.keys(base), ...Object.keys(override)]);

  return Object.fromEntries(
    [...keys].map((key) => {
      const baseValue = getOwn(base, key);
      const overrideValue = getOwn(override, key);

      return [
        key,
        isPlainObject(baseValue) && isPlainObject(overrideValue)
          ? mergeSettings(baseValue as object, overrideValue as object)
          : overrideValue !== undefined
          ? overrideValue
          : baseValue,
      ];
    })
  );
};

/**
 * The saved object update merges objects: a setting that is no longer sent would stay in the
 * output unless it is explicitly set to `null`, e.g. a verification that was skipped before. Returns
 * the new OAuth2 settings with a `null` for each saved setting that is not part of them.
 */
export function withRemovedKafkaOAuth2Settings<T extends object>(
  original: SavedKafkaOutput,
  oauth2: T
): T {
  const removed =
    original.type === 'kafka' ? nullsForRemovedSettings(original.oauth2, oauth2) : undefined;

  return removed ? (mergeSettings(removed, oauth2) as T) : oauth2;
}

const withoutNulls = (value: unknown): unknown => {
  if (!isPlainObject(value)) {
    return value;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const kept = entries
    .filter(([, nested]) => nested !== null && nested !== undefined)
    .map(([key, nested]) => [key, withoutNulls(nested)] as const)
    // a nested object that had only removed settings is removed too
    .filter(([key, nested]) => {
      const before = (value as Record<string, unknown>)[key];
      return !(
        isPlainObject(before) &&
        !isEmpty(before) &&
        isPlainObject(nested) &&
        isEmpty(nested)
      );
    });

  return Object.fromEntries(kept);
};

/**
 * Removes the OAuth2 settings set to `null` by an update (see `withRemovedKafkaOAuth2Settings`)
 * from the attributes of a saved output, so they are not part of the output.
 */
export function omitRemovedKafkaOAuth2Settings<T extends object>(attributes: T): T {
  const oauth2 = (attributes as { oauth2?: unknown }).oauth2;
  if (!isPlainObject(oauth2)) {
    return attributes;
  }

  return { ...attributes, oauth2: withoutNulls(oauth2) };
}

/**
 * Removes the OAuth2 secrets set to `null` by an update (see `getRemovedKafkaOAuth2Secrets`) from
 * the attributes of a saved output, so they are not part of the output.
 */
export function omitRemovedKafkaOAuth2Secrets<T extends object>(attributes: T): T {
  const secrets = (attributes as { secrets?: { oauth2?: Record<string, unknown> | null } }).secrets;
  if (!secrets || !('oauth2' in secrets)) {
    return attributes;
  }

  const { oauth2, ...otherSecrets } = secrets;
  const keptOAuth2 = Object.fromEntries(
    Object.entries(oauth2 ?? {}).filter(([, secret]) => secret !== null && secret !== undefined)
  );
  const newSecrets = isEmpty(keptOAuth2) ? otherSecrets : { ...otherSecrets, oauth2: keptOAuth2 };

  const { secrets: _secrets, ...otherAttributes } = attributes as T & { secrets?: unknown };

  // no secrets left: the output is as if it never had any
  return (isEmpty(newSecrets) ? otherAttributes : { ...otherAttributes, secrets: newSecrets }) as T;
}

/**
 * Whether an output payload uses the OAuth2 authentication method: it names it, or it sets OAuth2
 * settings or secrets without naming another method (a partial update). OAuth2 settings sent along
 * with another `auth_type` are leftovers, they are cleared and do not count.
 */
export function usesKafkaOAuth2(output: {
  type?: string;
  auth_type?: string | null;
  oauth2?: unknown;
  secrets?: unknown;
}): boolean {
  if (output.type !== 'kafka') {
    return false;
  }
  if (output.auth_type) {
    return output.auth_type === kafkaAuthType.OAuth2;
  }
  return (
    !isEmpty(output.oauth2) ||
    !isEmpty((output.secrets as { oauth2?: unknown } | undefined)?.oauth2)
  );
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * The agent reads a duration as a number of nanoseconds: it does not convert a text such as `10s`.
 */
const secondsToNanoseconds = (seconds: number) => Math.round(seconds * 1e9);

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
    const { timeout, expiry_buffer: expiryBuffer, ...otherSettings } = oauth2 ?? {};

    // the settings follow the `oauth2clientauthextension` of the collector, as the agent expects
    return {
      sasl: { mechanism: KAFKA_OAUTHBEARER_SASL_MECHANISM },
      auth: {
        oauth2client:
          pruneEmpty({
            ...otherSettings,
            ...(isNumber(timeout) ? { timeout: secondsToNanoseconds(timeout) } : {}),
            ...(isNumber(expiryBuffer)
              ? { expiry_buffer: secondsToNanoseconds(expiryBuffer) }
              : {}),
          }) ?? {},
      },
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
