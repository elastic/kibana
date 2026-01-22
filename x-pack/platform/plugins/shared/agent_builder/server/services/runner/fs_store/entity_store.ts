/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilesystemStorage } from './fs_storage';
import type { FileEntry, StoreManagement, StoreProvider, StoreToProviderInterface } from './types';

export interface EntityStore {
  // *** management APIs
  add(entry: FileEntry): Promise<void>;

  // *** access APIs
  get(path: string): Promise<FileEntry | undefined>;
  // ls
  // glob / find
  // grep
  // cat / head / tail
  // history
  // diff
}

export const createEntityStore = (storage?: FilesystemStorage): EntityStore => {
  return new EntityStoreImpl(storage);
};

class EntityStoreImpl implements EntityStore, StoreManagement {
  private readonly storage: FilesystemStorage;

  constructor(storage: FilesystemStorage = new FilesystemStorage()) {
    this.storage = storage;
  }

  async add(entry: FileEntry) {
    this.storage.add(entry);
  }

  async get(path: string) {
    return this.storage.get(path);
  }

  // management functions

  async addProvider(provider: StoreProvider) {
    const contract: StoreToProviderInterface = {
      addEntry: (entry) => {
        // TODO
      },
      removeEntry: (entry) => {
        // TODO
      },
    };
    await provider.connect(contract);
  }
}
