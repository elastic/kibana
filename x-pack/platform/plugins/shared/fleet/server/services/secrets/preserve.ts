/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get, has, isEmpty, isPlainObject, unset } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

/**
 * A credential that an object stores either in plain text or as a reference to a secret, e.g. the
 * client SSL key of an output, under `ssl.key` or `secrets.ssl.key`.
 */
export interface SecretFieldDefinition {
  /** Where the reference to the secret is kept, e.g. `secrets.ssl.key`. */
  secretPath: string;
  /** Where the plain text value is kept, e.g. `ssl.key`. Left out by the secrets-only fields. */
  plainPath?: string;
  /** The paths whose explicit `null` in an update removes the credential, e.g. `ssl`. */
  clearedBy?: string[];
  /** Whether an update that does not name the credential removes it, e.g. by changing its owner. */
  clearedWhen?: (update: object) => boolean;
}

/** Whether a value is a stored secret, i.e. a reference rather than a plain text value. */
const isSecretReference = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && ('id' in value || 'ids' in value);

/** Whether an update sets one of the paths to `null`, which removes the credential. */
const isExplicitlyCleared = (update: object, clearedBy: string[] | undefined): boolean =>
  (clearedBy ?? []).some((path) => has(update, path) && get(update, path) === null);

/**
 * The secrets of an object are diffed against the ones its update sends, so a secret the update
 * leaves out is taken to be removed, and is deleted. For a partial update, such as renaming an
 * output, that is wrong: it deletes a secret the user never touched, and leaves the object
 * pointing at a secret that no longer exists.
 *
 * Returns the update with, for each credential the object keeps as a secret:
 *
 * - the saved reference, when the update says nothing about the credential, so that the diff sees
 *   it as unchanged;
 * - the plain text value the update sends, moved under `secretPath`, so that a credential the
 *   object keeps as a secret stays a secret (an update that sends both is left alone and rejected
 *   by the validation of the object);
 * - nothing, when the update names the credential, or removes it with an explicit `null` or a
 *   change that `clearedWhen` matches: the update is authoritative.
 *
 * The update is not modified, a copy is returned when there is anything to change.
 */
export function withSavedSecrets<T extends object>(opts: {
  fields: SecretFieldDefinition[];
  original: object;
  update: T;
}): T {
  const { fields, original, update } = opts;

  const changes = fields.flatMap(({ secretPath, plainPath, clearedBy, clearedWhen }) => {
    const saved = get(original, secretPath);
    // nothing is stored as a secret: a plain text value is stored as plain text, as before
    if (!isSecretReference(saved)) {
      return [];
    }
    if (
      has(update, secretPath) ||
      isExplicitlyCleared(update, clearedBy) ||
      clearedWhen?.(update)
    ) {
      return [];
    }

    const plainValue = plainPath ? get(update, plainPath) : undefined;
    if (typeof plainValue === 'string' && plainValue !== '') {
      return [{ secretPath, value: plainValue, plainPath }];
    }

    // cloned, so that the update never shares a reference with the saved object
    return [{ secretPath, value: cloneDeep(saved), plainPath: undefined }];
  });

  if (!changes.length) {
    return update;
  }

  const result = cloneDeep(update);
  changes.forEach(({ secretPath, value, plainPath }) => {
    set(result, secretPath, value);
    if (plainPath) {
      // the value is stored as a secret: it must not be stored in plain text as well
      unset(result, plainPath);
    }
  });

  return result;
}

/** Removes the `null` values of an object, and the objects they leave empty. */
const withoutNulls = (value: unknown): unknown => {
  if (!isPlainObject(value)) {
    return value;
  }
  const kept = Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => nested !== null && nested !== undefined)
    .map(([key, nested]) => [key, withoutNulls(nested)] as const)
    // an object left empty by a removed secret is removed too
    .filter(([, nested]) => !(isPlainObject(nested) && isEmpty(nested)));

  return Object.fromEntries(kept);
};

/**
 * Removes the secrets an update cleared with a `null` (see `withClearedSecretReferences`) from the
 * attributes of a saved object, so a removed credential is not part of it. An object left without
 * any secret is as if it never had one.
 */
export function omitNullSecrets<T extends { secrets?: unknown }>(attributes: T): T {
  if (!isPlainObject(attributes.secrets)) {
    return attributes;
  }

  const secrets = withoutNulls(attributes.secrets);
  const { secrets: _secrets, ...otherAttributes } = attributes;

  return (isEmpty(secrets) ? otherAttributes : { ...otherAttributes, secrets }) as T;
}
