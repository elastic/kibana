/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from './plugin';
type EncryptedSavedObjectsPlugin = ReturnType<Plugin['setup']>;

const createEncryptedSavedObjectsMock = () => {
  const mocked: jest.Mocked<EncryptedSavedObjectsPlugin> = {
    isEncryptionError: jest.fn(),
    registerType: jest.fn(),
    getDecryptedAsInternalUser: jest.fn(),
  };
  return mocked;
};

export const encryptedSavedObjectsMock = {
  create: createEncryptedSavedObjectsMock,
};
