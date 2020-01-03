/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { SavedObject } from 'src/core/server';
import { EnrollmentApiKeysRepository } from './default';
import { SODatabaseAdapter as SODatabaseAdapterType } from '../../adapters/saved_objects_database/adapter_types';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/default';
import { MemorizeSODatabaseAdapter } from '../../adapters/saved_objects_database/memorize_adapter';
import { SAVED_OBJECT_TYPE } from './types';
import { EncryptedSavedObjects } from '../../adapters/encrypted_saved_objects/default';
import { MemorizeEncryptedSavedObjects } from '../../adapters/encrypted_saved_objects/memorize_adapter';
import { FrameworkUser, internalAuthData } from '../../adapters/framework/adapter_types';
import { EnrollmentApiKey } from '../../../common/types/domain_data';

describe('Enrollment api key Repository', () => {
  let adapter: EnrollmentApiKeysRepository;
  let soAdapter: SODatabaseAdapterType;
  let encryptedSavedObject: EncryptedSavedObjects;
  let servers: any;

  async function loadFixtures(keys: Array<Partial<EnrollmentApiKey>>): Promise<SavedObject[]> {
    return await Promise.all(keys.map(key => soAdapter.create(getUser(), SAVED_OBJECT_TYPE, key)));
  }

  async function clearFixtures() {
    const user = getUser();
    const { saved_objects: savedObjects } = await soAdapter.find(user, {
      type: SAVED_OBJECT_TYPE,
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(user, SAVED_OBJECT_TYPE, so.id);
    }
  }

  function getUser(): FrameworkUser {
    return ({
      kind: 'authenticated',
      [internalAuthData]: {
        headers: {
          authorization: `Basic ${Buffer.from(`elastic:changeme`).toString('base64')}`,
        },
      },
    } as unknown) as FrameworkUser;
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });
      const baseAdapter = new SODatabaseAdapter(
        servers.kbnServer.savedObjects,
        servers.kbnServer.plugins.elasticsearch
      );
      soAdapter = new MemorizeSODatabaseAdapter(baseAdapter);

      const baseEncyrptedSOAdapter = new EncryptedSavedObjects(
        servers.kbnServer.newPlatform.start.plugins.encryptedSavedObjects
      );

      encryptedSavedObject = (new MemorizeEncryptedSavedObjects(
        baseEncyrptedSOAdapter
      ) as unknown) as EncryptedSavedObjects;
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
    if (!encryptedSavedObject) {
      encryptedSavedObject = (new MemorizeEncryptedSavedObjects() as unknown) as EncryptedSavedObjects;
    }
    adapter = new EnrollmentApiKeysRepository(soAdapter, encryptedSavedObject);
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });

  afterEach(clearFixtures);

  describe('create', () => {
    it('allow to create an enrollment api key', async () => {
      const user = getUser();
      const enrollmentApiKey = await adapter.create(user, {
        active: true,
        apiKey: 'notencryptedkey',
        apiKeyId: 'key-id-123',
        policyId: 'policyId',
      });
      const savedEnrollmentApiKey = (await soAdapter.get<EnrollmentApiKey>(
        user,
        SAVED_OBJECT_TYPE,
        enrollmentApiKey.id
      )) as SavedObject;
      expect(savedEnrollmentApiKey).toBeDefined();
      expect(enrollmentApiKey.id).toBeDefined();

      expect(savedEnrollmentApiKey.attributes.apiKey !== 'notencryptedkey').toBe(true);

      expect(savedEnrollmentApiKey.attributes).toMatchObject({
        active: true,
        policy_id: 'policyId',
        api_key_id: 'key-id-123',
      });
    });
  });

  describe('update', () => {
    let enrollmentApiKeyId: string;
    beforeEach(async () => {
      const keys = await loadFixtures([
        {
          active: true,
          api_key: 'qwerty',
          policy_id: 'policyId',
        },
      ]);

      enrollmentApiKeyId = keys[0].id;
    });

    it('allow to update a key', async () => {
      const user = getUser();
      await adapter.update(user, enrollmentApiKeyId, {
        active: false,
        api_key: 'notencryptedapikey',
      });

      const soEnrollmentKey = (await soAdapter.get<EnrollmentApiKey>(
        user,
        SAVED_OBJECT_TYPE,
        enrollmentApiKeyId
      )) as SavedObject<EnrollmentApiKey>;
      expect(soEnrollmentKey.attributes.api_key !== 'notencryptedapikey').toBe(true);
      expect(soEnrollmentKey.attributes).toMatchObject({
        active: false,
      });
    });
  });

  describe('getByApiKeyId', () => {
    beforeEach(async () => {
      await loadFixtures([
        {
          active: true,
          api_key_id: 'api-key-1',
        },
        {
          active: true,
          api_key_id: 'api-key-2',
        },
      ]);
    });

    it('allow to find a key', async () => {
      const user = getUser();
      const enrollmentApiKey = await adapter.getByApiKeyId(user, 'api-key-2');
      expect(enrollmentApiKey).toBeDefined();
      expect((enrollmentApiKey as EnrollmentApiKey).api_key_id).toBe('api-key-2');
    });

    it('return null if the key does not exists', async () => {
      const user = getUser();
      const enrollmentApiKey = await adapter.getByApiKeyId(user, 'idonotexists');
      expect(enrollmentApiKey).toBeNull();
    });
  });

  describe('delete', () => {
    let enrollmentApiKeyId: string;
    beforeEach(async () => {
      const keys = await loadFixtures([
        {
          active: true,
          api_key_id: 'qwerty',
        },
      ]);

      enrollmentApiKeyId = keys[0].id;
    });

    it('allow to delete a enrollmentApiKey', async () => {
      const user = getUser();
      await adapter.delete(user, enrollmentApiKeyId);
      const soEnrollmentApiKey = await soAdapter.get<EnrollmentApiKey>(
        user,
        SAVED_OBJECT_TYPE,
        enrollmentApiKeyId
      );
      expect(soEnrollmentApiKey).toBeNull();
    });
  });
});
