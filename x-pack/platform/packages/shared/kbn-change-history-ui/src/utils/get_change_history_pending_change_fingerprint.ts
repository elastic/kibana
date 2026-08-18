/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';

// Fold the running hash into 32-bit range without bitwise ops (eslint no-bitwise).
const MOD = 2 ** 32;

const hashString = (value: string): string => {
  let hash = 5381;

  for (let index = 0; index < value.length; index++) {
    hash = (hash * 33 + value.charCodeAt(index)) % MOD;
  }

  return hash.toString(16);
};

const getSnapshotFingerprint = (snapshot: unknown): string => {
  if (snapshot === undefined) {
    return '';
  }

  const serialized = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);

  return `${serialized.length}:${hashString(serialized)}`;
};

/** Cheap fingerprint for memoizing pending-row merges without adapter identity churn. */
export const getChangeHistoryPendingChangeFingerprint = (
  pendingChange: ChangeHistoryPendingChange | undefined
): string => {
  if (!pendingChange) {
    return '';
  }

  return [
    pendingChange.id,
    pendingChange.timestamp,
    String(pendingChange.changes?.count ?? ''),
    getSnapshotFingerprint(pendingChange.snapshot),
  ].join('|');
};
