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
import { httpServerMock } from '../../../../../../../../src/core/server/mocks';

describe('Token Adapter', () => {
  let adapter: TokenAdapter;
  let soAdapter: SODatabaseAdapterType;
  let encryptedSavedObject: EncryptedSavedObjects;
  let servers: any;

  async function loadFixtures(tokens: any[]): Promise<SavedObject[]> {
    return await Promise.all(tokens.map(token => soAdapter.create('tokens', token)));
  }

  async function clearFixtures() {
    const { saved_objects: savedObjects } = await soAdapter.find({ type: 'tokens', perPage: 1000 });
    for (const so of savedObjects) {
      await soAdapter.delete('tokens', so.id);
    }
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      servers = await createKibanaServer({
        security: { enabled: false },
      });

      const soBaseAdapter = servers.kbnServer.savedObjects.getScopedSavedObjectsClient(
        httpServerMock.createKibanaRequest({
          headers: {
            authorization: `Basic ${Buffer.from(`elastic:changeme`).toString('base64')}`,
          },
        })
      );
      const baseAdapter = new SODatabaseAdapter(soBaseAdapter);
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
      const token = await adapter.create({
        active: true,
        type: TokenType.ACCESS_TOKEN,
        token: 'notencryptedtoken',
        tokenHash: 'qwerty',
        policy: { id: 'policyId', sharedId: 'sharedId' },
      });
      const soToken = (await soAdapter.get<Token>('tokens', token.id)) as SavedObject;
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
      await adapter.update(tokenId, {
        active: false,
        token: 'notencryptedtoken',
      });

      const soToken = (await soAdapter.get<Token>('tokens', tokenId)) as SavedObject<Token>;
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
      const token = await adapter.getByTokenHash('azerty');
      expect(token).toBeDefined();
      expect((token as Token).tokenHash).toBe('azerty');
    });

    it('return null if the token does not exists', async () => {
      const token = await adapter.getByTokenHash('idonotexists');
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
      const token = await adapter.getByPolicyId('policy12');
      expect(token).toBeDefined();
      expect((token as Token).policy_id).toBe('policy12');
      expect((token as Token).token).toBe('notencryptedtoken');
    });

    it('return null if the token does not exists', async () => {
      const token = await adapter.getByTokenHash('policy1234');
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
      await adapter.delete(tokenId);
      const soToken = await soAdapter.get<Token>('tokens', tokenId);
      expect(soToken).toBeNull();
    });
  });
});
