/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PENDING_RELOAD_SESSION_STORAGE_KEY, setPendingReloadFlag } from './pending_reload';

const createInMemoryStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
};

describe('pending_reload', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createInMemoryStorage();
  });

  it('returns a persisted pending reload flag value', () => {
    setPendingReloadFlag(storage);

    expect(storage.getItem(PENDING_RELOAD_SESSION_STORAGE_KEY)).toBe('1');
  });

  it('returns no thrown error when storage setItem fails', () => {
    const throwingStorage: Storage = {
      get length() {
        return 0;
      },
      clear() {},
      getItem() {
        return null;
      },
      key() {
        return null;
      },
      removeItem() {},
      setItem() {
        throw new Error('setItem failed');
      },
    };

    expect(() => setPendingReloadFlag(throwingStorage)).not.toThrow();
  });
});
