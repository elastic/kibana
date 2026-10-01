/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { clearPendingLensAttach, getPendingLensAttach, setPendingLensAttach } from './storage';
import { PENDING_LENS_ATTACH_STORAGE_ID } from './constants';

const buildStorage = (
  initial: Record<string, unknown> = {}
): IStorageWrapper & {
  store: Record<string, unknown>;
} => {
  const store: Record<string, unknown> = { ...initial };
  return {
    store,
    get: jest.fn((key: string) => store[key]),
    set: jest.fn((key: string, value: unknown) => {
      store[key] = value;
    }),
    remove: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      for (const key of Object.keys(store)) delete store[key];
    }),
  };
};

const validRecord = {
  caseId: 'case-1',
  caseOwner: 'cases',
  savedObjectId: 'lens-1',
  title: 'Top hosts',
};

describe('pending lens attach storage', () => {
  it('round trips a valid record', () => {
    const storage = buildStorage();
    setPendingLensAttach(storage, validRecord);
    expect(storage.set).toHaveBeenCalledWith(PENDING_LENS_ATTACH_STORAGE_ID, validRecord);
    expect(getPendingLensAttach(storage)).toEqual(validRecord);
  });

  it('returns null for a missing record', () => {
    expect(getPendingLensAttach(buildStorage())).toBeNull();
  });

  it('returns null when the stored value is malformed', () => {
    const storage = buildStorage({ [PENDING_LENS_ATTACH_STORAGE_ID]: { caseId: 1 } });
    expect(getPendingLensAttach(storage)).toBeNull();
  });

  it('clears the record', () => {
    const storage = buildStorage({ [PENDING_LENS_ATTACH_STORAGE_ID]: validRecord });
    clearPendingLensAttach(storage);
    expect(storage.remove).toHaveBeenCalledWith(PENDING_LENS_ATTACH_STORAGE_ID);
    expect(storage.store[PENDING_LENS_ATTACH_STORAGE_ID]).toBeUndefined();
  });
});
