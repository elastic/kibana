/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, isPlainObject } from 'lodash';

import {
  KAFKA_OAUTHBEARER_SASL_MECHANISM,
  kafkaAuthType,
  kafkaKerberosAuthType,
} from '../../../common/constants';
import type { KafkaOutput, ValueOf } from '../../../common/types';

type KafkaAuthTypeValue = ValueOf<typeof kafkaAuthType>;

/**
 * The authentication methods that keep their settings and their secrets in the output, under a
 * key with the name of the method (`oauth2` and `secrets.oauth2`, for example).
 */
export const KAFKA_AUTH_METHODS = ['oauth2', 'kerberos'] as const;
export type KafkaAuthMethod = (typeof KAFKA_AUTH_METHODS)[number];

const AUTH_TYPE_OF_METHOD: Record<KafkaAuthMethod, KafkaAuthTypeValue> = {
  oauth2: kafkaAuthType.OAuth2,
  kerberos: kafkaAuthType.Kerberos,
};

/** The method an `auth_type` belongs to, if it is one that keeps its settings in the output. */
export const getKafkaAuthMethod = (
  authType: KafkaOutput['auth_type'] | null | undefined
): KafkaAuthMethod | undefined =>
  KAFKA_AUTH_METHODS.find((method) => AUTH_TYPE_OF_METHOD[method] === authType);

/**
 * Output fields that only make sense for one `auth_type`. They are cleared when the output uses any
 * other `auth_type`, including an `auth_type` that owns no field and so has no entry. A new
 * authentication method registers the fields it owns here.
 */
const KAFKA_AUTH_TYPE_OWNED_FIELDS: Partial<Record<KafkaAuthTypeValue, string[]>> = {
  [kafkaAuthType.None]: ['connection_type'],
  [kafkaAuthType.Userpass]: ['username', 'password'],
  [kafkaAuthType.OAuth2]: ['oauth2'],
  [kafkaAuthType.Kerberos]: ['kerberos'],
};

/**
 * Output fields cleared when the output uses the given `auth_type`, because they do not apply to
 * it. They are kept for the other types, as the agent ignores them there.
 */
const KAFKA_AUTH_TYPE_CLEARED_FIELDS: Partial<Record<KafkaAuthTypeValue, string[]>> = {
  [kafkaAuthType.OAuth2]: ['sasl'],
  [kafkaAuthType.Kerberos]: ['sasl'],
};

/**
 * Secrets, under `secrets`, that only make sense for one `auth_type`.
 * `secrets.password` is not listed on purpose: it is kept for every `auth_type`, as before.
 */
const KAFKA_AUTH_TYPE_OWNED_SECRETS: Partial<Record<KafkaAuthTypeValue, string[]>> = {
  [kafkaAuthType.OAuth2]: ['oauth2'],
  [kafkaAuthType.Kerberos]: ['kerberos'],
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

/** The parts of an output payload or saved output that the helpers read. */
export interface KafkaAuthOutput {
  type?: string;
  auth_type?: string | null;
  secrets?: unknown;
  oauth2?: unknown;
  kerberos?: unknown;
}
type SavedKafkaOutput = KafkaAuthOutput;

const secretsOf = (output: { secrets?: unknown }, method: KafkaAuthMethod) =>
  (output.secrets as Record<string, Record<string, unknown> | null | undefined> | undefined)?.[
    method
  ];

/**
 * The saved object update merges objects: a secret that is no longer sent is deleted, but its
 * reference stays in the output unless it is explicitly set to `null`. Returns those `null`s for
 * the secrets of the method that the output has and the update does not keep (`undefined` if none).
 */
export function getRemovedKafkaAuthSecrets(
  method: KafkaAuthMethod,
  original: { type?: string; secrets?: unknown },
  updatedSecrets: unknown
): Record<string, null> | undefined {
  const saved = secretsOf(original, method);
  if (original.type !== 'kafka' || !saved) {
    return undefined;
  }

  const kept = secretsOf({ secrets: updatedSecrets }, method);
  const removed = Object.keys(saved).filter((key) => saved[key] && !kept?.[key]);

  return removed.length ? Object.fromEntries(removed.map((key) => [key, null])) : undefined;
}

/**
 * An update that does not name an `auth_type` leaves the authentication of the output as it is. For
 * an output that uses the method, the settings and secrets the update does not send are the saved
 * ones, so that renaming the output, for example, does not remove them.
 */
export function withSavedKafkaAuth<T extends object>(
  method: KafkaAuthMethod,
  original: SavedKafkaOutput,
  update: T
): T {
  const sent = update as { auth_type?: unknown; secrets?: object } & Record<string, unknown>;
  if (original.type !== 'kafka' || original.auth_type !== AUTH_TYPE_OF_METHOD[method]) {
    return update;
  }
  if (sent.auth_type !== undefined) {
    return update;
  }

  const secrets = secretsOf(original, method);

  return {
    ...update,
    ...(sent[method] === undefined && original[method] ? { [method]: original[method] } : {}),
    ...(!secretsOf(sent, method) && secrets
      ? { secrets: { ...sent.secrets, [method]: secrets } }
      : {}),
  };
}

/**
 * Whether an update keeps the authentication of an output exactly as it is: the same settings, and
 * the saved secrets sent back as references. Such an update does not need the method to be
 * allowed, it is an ordinary edit of the output.
 *
 * An update that names the authentication but leaves out the saved secrets does not keep it: the
 * secrets would be deleted. (An update that does not name it gets the saved secrets restored first,
 * see `withSavedKafkaAuth`.)
 */
export function keepsKafkaAuth(
  method: KafkaAuthMethod,
  original: SavedKafkaOutput,
  update: KafkaAuthOutput
): boolean {
  const authType = AUTH_TYPE_OF_METHOD[method];
  if (original.type !== 'kafka' || original.auth_type !== authType) {
    return false;
  }
  if (
    (update.type !== undefined && update.type !== 'kafka') ||
    (update.auth_type !== undefined && update.auth_type !== authType)
  ) {
    return false;
  }
  if (!isEqual(update[method] ?? original[method], original[method])) {
    return false;
  }

  const saved = secretsOf(original, method) ?? {};
  const sent = secretsOf(update, method);
  if (!sent) {
    // nothing to lose when nothing is saved, e.g. an output set up before the settings existed
    return isEmpty(saved);
  }
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
 * the new settings of the method with a `null` for each saved setting that is not part of them.
 */
export function withRemovedKafkaAuthSettings<T extends object>(
  method: KafkaAuthMethod,
  original: SavedKafkaOutput,
  settings: T
): T {
  const removed =
    original.type === 'kafka' ? nullsForRemovedSettings(original[method], settings) : undefined;

  return removed ? (mergeSettings(removed, settings) as T) : settings;
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
 * Removes the settings of the method set to `null` by an update (see
 * `withRemovedKafkaAuthSettings`) from the attributes of a saved output, so they are not part of
 * the output.
 */
export function omitRemovedKafkaAuthSettings<T extends object>(
  method: KafkaAuthMethod,
  attributes: T
): T {
  const settings = (attributes as Record<string, unknown>)[method];
  if (!isPlainObject(settings)) {
    return attributes;
  }

  return { ...attributes, [method]: withoutNulls(settings) };
}

/**
 * Removes the secrets of the method set to `null` by an update (see `getRemovedKafkaAuthSecrets`)
 * from the attributes of a saved output, so they are not part of the output.
 */
export function omitRemovedKafkaAuthSecrets<T extends object>(
  method: KafkaAuthMethod,
  attributes: T
): T {
  const secrets = (attributes as { secrets?: Record<string, unknown> }).secrets;
  if (!secrets || !(method in secrets)) {
    return attributes;
  }

  const { [method]: methodSecrets, ...otherSecrets } = secrets;
  const keptSecrets = Object.fromEntries(
    Object.entries((methodSecrets as Record<string, unknown> | null) ?? {}).filter(
      ([, secret]) => secret !== null && secret !== undefined
    )
  );
  const newSecrets = isEmpty(keptSecrets)
    ? otherSecrets
    : { ...otherSecrets, [method]: keptSecrets };

  const { secrets: _secrets, ...otherAttributes } = attributes as T & { secrets?: unknown };

  // no secrets left: the output is as if it never had any
  return (isEmpty(newSecrets) ? otherAttributes : { ...otherAttributes, secrets: newSecrets }) as T;
}

/** Applies `omitRemovedKafkaAuthSettings` and `omitRemovedKafkaAuthSecrets` for every method. */
export function omitRemovedKafkaAuthData<T extends object>(attributes: T): T {
  return KAFKA_AUTH_METHODS.reduce(
    (result, method) =>
      omitRemovedKafkaAuthSettings(method, omitRemovedKafkaAuthSecrets(method, result)),
    attributes
  );
}

/**
 * Whether an output payload uses the authentication method: it names it, or it sets settings or
 * secrets of the method without naming another one (a partial update). Settings sent along with
 * another `auth_type` are leftovers, they are cleared and do not count.
 */
export function usesKafkaAuth(method: KafkaAuthMethod, output: KafkaAuthOutput): boolean {
  if (output.type !== 'kafka') {
    return false;
  }
  if (output.auth_type) {
    return output.auth_type === AUTH_TYPE_OF_METHOD[method];
  }
  return !isEmpty(output[method]) || !isEmpty(secretsOf(output, method));
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
  output: Pick<KafkaOutput, 'auth_type' | 'username' | 'password' | 'sasl' | 'oauth2' | 'kerberos'>
): Record<string, unknown> {
  const { username, password, sasl, oauth2, kerberos } = output;

  if (output.auth_type === kafkaAuthType.Kerberos) {
    // the `kerberos` settings switch the agent to the GSSAPI mechanism by themselves: a `sasl`
    // mechanism or top-level credentials next to them are not valid. Only the settings of the
    // authentication type in use are sent, the password comes with the secrets.
    const {
      auth_type: kerberosAuthType,
      keytab,
      username: kerberosUsername,
      ...others
    } = kerberos ?? {};
    const isKeytab = kerberosAuthType === kafkaKerberosAuthType.Keytab;

    return kerberos
      ? {
          kerberos: {
            enabled: true,
            auth_type: kerberosAuthType,
            ...(isKeytab ? { keytab } : { username: kerberosUsername }),
            ...others,
          },
        }
      : {};
  }

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
