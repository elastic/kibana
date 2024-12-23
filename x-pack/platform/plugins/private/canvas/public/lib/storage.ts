/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { getWindow } from './get_window';

export enum StorageType {
  Local = 'localStorage',
  Session = 'sessionStorage',
}

const storages: {
  [x in StorageType]: Storage | null;
} = {
  [StorageType.Local]: null,
  [StorageType.Session]: null,
};

const getStorage = (type: StorageType): Storage => {
  const storage = storages[type] || new Storage(getWindow()[type]);
  storages[type] = storage;

  return storage;
};

export const getLocalStorage = (): Storage => {
  return getStorage(StorageType.Local);
};

export const getSessionStorage = (): Storage => {
  return getStorage(StorageType.Session);
};
