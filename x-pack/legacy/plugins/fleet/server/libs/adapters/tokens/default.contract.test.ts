/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { SavedObject } from 'src/core/server';
import { TokenAdapter } from './default';
import { SODatabaseAdapter as SODatabaseAdapterType } from '../saved_objets_database/adapter_types';
import { SODatabaseAdapter } from '../saved_objets_database/default';
import { MemorizeSODatabaseAdapter } from '../saved_objets_database/memorize_adapter';
import { createKibanaServer } from '../../../../../../../test_utils/jest/contract_tests/servers';
import { Token, TokenType } from './adapter_types';
import { EncryptedSavedObjects } from '../encrypted_saved_objects/default';
import { MemorizeEncryptedSavedObjects } from '../encrypted_saved_objects/memorize_adapter';
import { FrameworkUser, internalAuthData } from '../framework/adapter_types';

describe('Token Adapter', () => {
  let adapter: TokenAdapter;
  let soAdapter: SODatabaseAdapterType;
  let encryptedSavedObject: EncryptedSavedObjects;
  let servers: any;

  async function loadFixtures(tokens: any[]): Promise<SavedObject[]> {
    return await Promise.all(tokens.map(token => soAdapter.create(getUser(), 'tokens', token)));
  }

  async function clearFixtures() {
    const user = getUser();
    const { saved_objects: savedObjects } = await soAdapter.find(user, {
      type: 'tokens',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(user, 'tokens', so.id);
    }
  }

  function getUser(): FrameworkUser {
    return ({
      kind: 'authenticated',
      [internalAuthData]: {
        authorization: `Basic ${Buffer.from(`elastic:changeme`).toString('base64')}`,
      },
    } as unknown) as FrameworkUser;
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      servers = await createKibanaServer({
        security: { enabled: false },
      });
      const baseAdapter = new SODatabaseAdapter(
        servers.kbnServer.savedObjects,
        servers.kbnServer.plugins.elasticsearch
      );
      soAdapter = new MemorizeSODatabaseAdapter(baseAdapter);

      const baseEncyrptedSOAdapter = new EncryptedSavedObjects(
        servers.kbnServer.plugins.encrypted_saved_objects
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
    adapter = new TokenAdapter(soAdapter, encryptedSavedObject);
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });

  afterEach(clearFixtures);

  describe('create', () => {
    it('allow to create a token', async () => {
      const user = getUser();
      const token = await adapter.create(user, {
        active: true,
        type: TokenType.ACCESS_TOKEN,
        token: 'notencryptedtoken',
        tokenHash: 'qwerty',
        policy: { id: 'policyId', sharedId: 'sharedId' },
      });
      const soToken = (await soAdapter.get<Token>(user, 'tokens', token.id)) as SavedObject;
      expect(soToken).toBeDefined();
      expect(token.id).toBeDefined();

      expect(soToken.attributes.token !== 'notencryptedtoken').toBe(true);

      expect(soToken.attributes).toMatchObject({
        active: true,
        type: TokenType.ACCESS_TOKEN,
        tokenHash: 'qwerty',
      });
    });
  });

  describe('update', () => {
    let tokenId: string;
    beforeEach(async () => {
      const tokens = await loadFixtures([
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          tokenHash: 'qwerty',
          policy_id: 'policyId',
          policy_shared_id: 'sharedId',
        },
      ]);

      tokenId = tokens[0].id;
    });

    it('allow to update a token', async () => {
      const user = getUser();
      await adapter.update(user, tokenId, {
        active: false,
        token: 'notencryptedtoken',
      });

      const soToken = (await soAdapter.get<Token>(user, 'tokens', tokenId)) as SavedObject<Token>;
      expect(soToken.attributes.token !== 'notencryptedtoken').toBe(true);
      expect(soToken.attributes).toMatchObject({
        active: false,
      });
    });
  });

  describe('getByTokenHash', () => {
    beforeEach(async () => {
      await loadFixtures([
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          tokenHash: 'qwerty',
        },
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          tokenHash: 'azerty',
        },
      ]);
    });

    it('allow to find a token', async () => {
      const user = getUser();
      const token = await adapter.getByTokenHash(user, 'azerty');
      expect(token).toBeDefined();
      expect((token as Token).tokenHash).toBe('azerty');
    });

    it('return null if the token does not exists', async () => {
      const user = getUser();
      const token = await adapter.getByTokenHash(user, 'idonotexists');
      expect(token).toBeNull();
    });
  });

  describe('getByPolicyId', () => {
    beforeEach(async () => {
      await loadFixtures([
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          tokenHash: 'qwerty',
          policy_id: 'policy1',
        },
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          token: 'notencryptedtoken',
          tokenHash: 'azerty',
          policy_id: 'policy12',
        },
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          tokenHash: 'azerty',
          policy_id: 'policy123',
        },
      ]);
    });

    it('allow to find a token', async () => {
      const user = getUser();
      const token = await adapter.getByPolicyId(user, 'policy12');
      expect(token).toBeDefined();
      expect((token as Token).policy_id).toBe('policy12');
      expect((token as Token).token).toBe('notencryptedtoken');
    });

    it('return null if the token does not exists', async () => {
      const user = getUser();
      const token = await adapter.getByTokenHash(user, 'policy1234');
      expect(token).toBeNull();
    });
  });

  describe('delete', () => {
    let tokenId: string;
    beforeEach(async () => {
      const tokens = await loadFixtures([
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          tokenHash: 'qwerty',
        },
      ]);

      tokenId = tokens[0].id;
    });

    it('allow to update a token', async () => {
      const user = getUser();
      await adapter.delete(user, tokenId);
      const soToken = await soAdapter.get<Token>(user, 'tokens', tokenId);
      expect(soToken).toBeNull();
    });
  });
});
