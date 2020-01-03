/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { SavedObject } from 'src/core/server';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/adapter_types';
import {
  EnrollmentApiKeysRepository as EnrollmentApiKeysRepositoryType,
  SAVED_OBJECT_TYPE,
} from './types';
import { EncryptedSavedObjects } from '../../adapters/encrypted_saved_objects/adapter_types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { EnrollmentApiKey } from '../../../common/types/domain_data';

function getFirstOrNull<T>(list: T[]): T | null {
  return list.length > 0 ? list[0] : null;
}

/**
 * EnrollmentApiKey repository that persist keys using saved objects
 */
export class EnrollmentApiKeysRepository implements EnrollmentApiKeysRepositoryType {
  constructor(
    private readonly soAdapter: SODatabaseAdapter,
    private readonly encryptedSavedObject: EncryptedSavedObjects
  ) {}

  public async list(
    user: FrameworkUser<any>,
    options: {
      page?: number;
      perPage?: number;
      kuery?: string;
      showInactive?: boolean;
    }
  ): Promise<{ items: EnrollmentApiKey[]; total: any; page: any; perPage: any }> {
    const { page = 1, perPage = 20, kuery } = options;

    const { saved_objects, total } = await this.soAdapter.find(user, {
      type: SAVED_OBJECT_TYPE,
      page,
      perPage,
      filter:
        kuery && kuery !== ''
          ? kuery.replace(/enrollment_api_keys\./g, 'enrollment_api_keys.attributes.')
          : undefined,
    });

    const items = saved_objects.map(this._savedObjectToEnrollmentApiKey);

    return {
      items,
      total,
      page,
      perPage,
    };
  }

  public async create(
    user: FrameworkUser,
    {
      apiKeyId,
      apiKey,
      active,
      policyId,
      expire_at,
      name,
    }: {
      apiKeyId: string;
      apiKey: string;
      active: boolean;
      expire_at?: string;
      policyId?: string;
      name?: string;
    }
  ): Promise<EnrollmentApiKey> {
    if (user.kind !== 'authenticated') {
      throw new Error('Only authenticated user can create enrollment api keys.');
    }
    const so = await this.soAdapter.create(user, SAVED_OBJECT_TYPE, {
      created_at: moment().toISOString(),
      api_key: apiKey,
      api_key_id: apiKeyId,
      policy_id: policyId,
      expire_at,
      active,
      enrollment_rules: [],
      name,
    });

    return {
      id: so.id,
      ...so.attributes,
      api_key: apiKey,
    };
  }

  public async getByApiKeyId(
    user: FrameworkUser,
    apiKeyId: string
  ): Promise<EnrollmentApiKey | null> {
    const res = await this.soAdapter.find(user, {
      type: SAVED_OBJECT_TYPE,
      searchFields: ['api_key_id'],
      search: apiKeyId,
    });

    const keys = res.saved_objects.map(this._savedObjectToEnrollmentApiKey);
    const key = getFirstOrNull(keys);
    return key ? await this._getDecrypted(key.id) : null;
  }

  public async getById(user: FrameworkUser, id: string): Promise<EnrollmentApiKey | null> {
    return await this._getDecrypted(id);
  }

  public async update(
    user: FrameworkUser,
    id: string,
    newData: Partial<EnrollmentApiKey>
  ): Promise<void> {
    if (user.kind !== 'authenticated') {
      throw new Error('Only authenticated can update enrollment api keys');
    }
    const { error } = await this.soAdapter.update(user, SAVED_OBJECT_TYPE, id, newData);

    if (error) {
      throw new Error(error.message);
    }
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    await this.soAdapter.delete(user, SAVED_OBJECT_TYPE, id);
  }

  private async _getDecrypted(id: string) {
    return this._savedObjectToEnrollmentApiKey(
      await this.encryptedSavedObject.getDecryptedAsInternalUser(SAVED_OBJECT_TYPE, id)
    );
  }

  private _savedObjectToEnrollmentApiKey({
    error,
    attributes,
    id,
  }: SavedObject<EnrollmentApiKey>): EnrollmentApiKey {
    if (error) {
      throw new Error(error.message);
    }

    return {
      id,
      ...attributes,
    };
  }
}
