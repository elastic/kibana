/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import { flattenObject as flatten, unflattenObject as unflatten } from '@kbn/object-utils';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { Logger } from '@kbn/logging';
import type { ChangeHistoryDocument, ChangeHistoryFieldsToMask } from './types';

export const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

/** Placeholder stored in place of a redacted value. */
export const REDACTED = '[redacted]';

export interface SanitizeFieldsOpts {
  fieldsToHash?: ChangeHistoryFieldsToMask;
  fieldsToRedact?: ChangeHistoryFieldsToMask;
  salt?: string;
}

const hasFields = (fields?: ChangeHistoryFieldsToMask) =>
  !!fields && Object.keys(fields).length > 0;

const matcher = (fields: ChangeHistoryFieldsToMask) => {
  const flat = flatten(fields);
  return (key: string) =>
    Object.entries(flat).some(([k, v]) => Boolean(v) && (key === k || key.startsWith(`${k}.`)));
};

/**
 * Masks sensitive string fields in a snapshot, by hashing or redacting. Redaction wins when a
 * field matches both maps. Returns a new snapshot when anything changes.
 *
 * @param snapshot - The snapshot to process.
 * @param opts.fieldsToHash - Field paths to replace with a salted SHA-256 digest (high-entropy secrets only).
 * @param opts.fieldsToRedact - Field paths to replace with a `[redacted]` placeholder (low-entropy data).
 * @param opts.salt - Salt for the hash, use the object.id. Required only when hashing.
 * @returns The flattened paths that were hashed/redacted and the masked snapshot.
 * @example
 *   const snapshot = { api: { key: 'sk-9f8a7b6c5d4e' }, owner: { email: 'bob@example.com' } };
 *   const result = sanitizeFields(snapshot, {
 *     fieldsToHash: { api: { key: true } },
 *     fieldsToRedact: { owner: { email: true } },
 *     salt: 'rule-id-123',
 *   });
 *   // {
 *   //  fields: { hashed: ['api.key'], redacted: ['owner.email'] },
 *   //  snapshot: { api: { key: '2da53d7f04d1' }, owner: { email: '[redacted]' } }
 *   // }
 */
export function sanitizeFields(
  snapshot: Record<string, any>,
  { fieldsToHash, fieldsToRedact, salt }: SanitizeFieldsOpts = {}
): { fields: { hashed: string[]; redacted: string[] }; snapshot: Record<string, any> } {
  const hashed: string[] = [];
  const redacted: string[] = [];
  const shouldHash = hasFields(fieldsToHash);
  const shouldRedact = hasFields(fieldsToRedact);
  if (!shouldHash && !shouldRedact) {
    return { fields: { hashed, redacted }, snapshot };
  }
  if (shouldHash && !salt) {
    throw new Error('sanitizeFields: salt missing when hashing fields, please use the object.id');
  }
  const flatSnapshot = flatten(snapshot);
  const matchHash = fieldsToHash ? matcher(fieldsToHash) : () => false;
  const matchRedact = fieldsToRedact ? matcher(fieldsToRedact) : () => false;

  for (const key of Object.keys(flatSnapshot)) {
    const value = flatSnapshot[key];
    if (typeof value !== 'string') {
      continue;
    }
    if (matchRedact(key)) {
      redacted.push(key);
      flatSnapshot[key] = REDACTED;
    } else if (matchHash(key)) {
      hashed.push(key);
      flatSnapshot[key] = sha256(salt + value).slice(-12);
    }
  }

  return {
    fields: { hashed, redacted },
    snapshot: unflatten(flatSnapshot),
  };
}

/**
 * Best-effort read-time enrichment: mutates each item's `user.full_name` in place from the
 * matching user profile. Short-circuits when no `user.id`s are present. `bulkGet` failures
 * are logged via `logger.warn` and swallowed so history reads never fail on profile lookup.
 * @param items - Change history documents to enrich in place.
 * @param service - User profile service used to resolve display names.
 * @param logger - Logger used to record lookup failures.
 */
export const enrichWithProfiles = async (
  items: ChangeHistoryDocument[],
  service: UserProfileServiceStart,
  logger: Logger
): Promise<void> => {
  const uids = new Set<string>();
  for (const item of items) {
    if (item.user.id) uids.add(item.user.id);
  }
  if (uids.size === 0) return;
  try {
    const profiles = await service.bulkGet({ uids });
    const map = new Map(profiles.map((p) => [p.uid, p]));
    for (const item of items) {
      const profile = item.user.id ? map.get(item.user.id) : undefined;
      if (profile?.user.full_name) {
        item.user.full_name = profile.user.full_name;
      }
    }
  } catch (err) {
    logger.warn(`Failed to resolve user profiles for change history: ${err}`);
  }
};
