/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBaseOptions, SavedObjectAttributes, SavedObject } from 'src/core/server';
import { EncryptedSavedObjectsPlugin } from '../../../../encrypted_saved_objects';

export class EncryptedSavedObjects {
  constructor(private readonly plugin: EncryptedSavedObjectsPlugin) {}

  public async getDecryptedAsInternalUser<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObject<T>> {
    return await this.plugin.getDecryptedAsInternalUser<T>(type, id, options);
  }
}
