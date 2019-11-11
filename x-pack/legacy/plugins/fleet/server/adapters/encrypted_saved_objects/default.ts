/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBaseOptions, SavedObjectAttributes, SavedObject } from 'src/core/server';
import { PluginStartContract } from '../../../../../../plugins/encrypted_saved_objects/server';

export class EncryptedSavedObjects {
  constructor(private readonly plugin: PluginStartContract) {}

  public async getDecryptedAsInternalUser<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObject<T>> {
    return await this.plugin.getDecryptedAsInternalUser<T>(type, id, options);
  }
}
