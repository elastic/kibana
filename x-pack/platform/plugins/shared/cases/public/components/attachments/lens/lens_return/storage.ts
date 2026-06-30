/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { PENDING_LENS_ATTACH_STORAGE_ID } from './constants';

// Persisted across the navigation to Lens and back. Scoped to a single
// in-flight attach; the consumer must clear it on success or when the user
// returns without saving (the state-transfer consume call drains the package).
export interface PendingLensAttach {
  caseId: string;
  caseOwner: string;
  savedObjectId: string;
  title: string;
  createdAt: number;
}

const isPendingLensAttach = (value: unknown): value is PendingLensAttach => {
  if (!isPlainObject(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.caseId === 'string' &&
    typeof record.caseOwner === 'string' &&
    typeof record.savedObjectId === 'string' &&
    typeof record.title === 'string' &&
    typeof record.createdAt === 'number'
  );
};

export const setPendingLensAttach = (storage: IStorageWrapper, record: PendingLensAttach): void => {
  storage.set(PENDING_LENS_ATTACH_STORAGE_ID, record);
};

export const getPendingLensAttach = (storage: IStorageWrapper): PendingLensAttach | null => {
  const raw = storage.get(PENDING_LENS_ATTACH_STORAGE_ID);
  return isPendingLensAttach(raw) ? raw : null;
};

export const clearPendingLensAttach = (storage: IStorageWrapper): void => {
  storage.remove(PENDING_LENS_ATTACH_STORAGE_ID);
};
