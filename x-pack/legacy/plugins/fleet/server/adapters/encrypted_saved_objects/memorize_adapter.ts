/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memorize } from '@mattapperson/slapshot/lib/memorize';
import { SavedObjectsBaseOptions, SavedObjectAttributes, SavedObject } from 'src/core/server';
import { EncryptedSavedObjects } from './default';

/**
 * Memorize adpater for test purpose only
 */
export class MemorizeEncryptedSavedObjects {
  constructor(private readonly adapter?: EncryptedSavedObjects) {}

  public async getDecryptedAsInternalUser<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObject<T>> {
    return await memorize(
      `getDecryptedAsInternalUser:${type}:${id}`,
      async () => {
        if (!this.adapter) {
          throw new Error('You must provide an adapter to run this method online');
        }

        return await this.adapter.getDecryptedAsInternalUser(type, id, options);
      },
      {
        pure: false,
      }
    );
  }
}
