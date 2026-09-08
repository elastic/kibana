/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import { isPlainObject } from 'lodash';
import type { ChangeHistoryFieldsToMask } from './types';

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

type MaskNode = boolean | ChangeHistoryFieldsToMask | undefined;

/**
 * Resolves the mask that applies to `key` one level down. A `true` mask matches
 * the whole subtree, so it propagates as-is. Mask keys match snapshot keys
 * verbatim (dots included); nesting expresses paths.
 */
const childMask = (mask: MaskNode, key: string): MaskNode => {
  if (mask === true) {
    return true;
  }
  if (isPlainObject(mask)) {
    return (mask as ChangeHistoryFieldsToMask)[key];
  }
  return undefined;
};

/**
 * Masks sensitive string fields in a snapshot, by hashing or redacting. Redaction wins when a
 * field matches both maps. Returns a new snapshot when anything changes.
 *
 * Snapshot keys are preserved verbatim, including keys that contain dots. Mask keys match
 * snapshot keys literally (a mask key `'first.name'` matches only a snapshot key named
 * `'first.name'`); use nesting to select nested fields.
 *
 * @param snapshot - The snapshot to process.
 * @param opts.fieldsToHash - Field paths to replace with a salted SHA-256 digest (high-entropy secrets only).
 * @param opts.fieldsToRedact - Field paths to replace with a `[redacted]` placeholder (low-entropy data).
 * @param opts.salt - Salt for the hash, use the object.id. Required only when hashing.
 * @returns The dot-joined paths that were hashed/redacted and the masked snapshot.
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

  const walk = (
    node: Record<string, any>,
    hashMask: MaskNode,
    redactMask: MaskNode,
    parentPath: string
  ): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const key of Object.keys(node)) {
      const value = node[key];
      const path = parentPath ? `${parentPath}.${key}` : key;
      const hashChild = childMask(hashMask, key);
      const redactChild = childMask(redactMask, key);
      if (typeof value === 'string' && redactChild === true) {
        redacted.push(path);
        result[key] = REDACTED;
      } else if (typeof value === 'string' && hashChild === true) {
        hashed.push(path);
        result[key] = sha256(salt + value).slice(-12);
      } else if (isPlainObject(value) && (hashChild || redactChild)) {
        result[key] = walk(value, hashChild, redactChild, path);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return {
    fields: { hashed, redacted },
    snapshot: walk(
      snapshot,
      shouldHash ? fieldsToHash : undefined,
      shouldRedact ? fieldsToRedact : undefined,
      ''
    ),
  };
}
