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

describe('Agent Adapter', () => {
  let adapter: TokenAdapter;
  let soAdapter: SODatabaseAdapterType;
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
      const baseAdapter = new SODatabaseAdapter(
        servers.kbnServer.savedObjects,
        servers.kbnServer.plugins.elasticsearch
      );
      soAdapter = new MemorizeSODatabaseAdapter(baseAdapter);
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
    adapter = new TokenAdapter(soAdapter);
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
        token: 'qwerty',
        config: { id: 'configId', sharedId: 'sharedId' },
      });
      const soToken = (await soAdapter.get<Token>('tokens', token.id)) as SavedObject;
      expect(token).toBeDefined();
      expect(token.id).toBeDefined();
      expect(soToken.attributes).toMatchObject({
        active: true,
        type: TokenType.ACCESS_TOKEN,
        token: 'qwerty',
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
          token: 'qwerty',
          config: { id: 'configId', sharedId: 'sharedId' },
        },
      ]);

      tokenId = tokens[0].id;
    });

    it('allow to update a token', async () => {
      await adapter.update(tokenId, {
        active: false,
      });
      const soToken = (await soAdapter.get<Token>('tokens', tokenId)) as SavedObject;
      expect(soToken.attributes).toMatchObject({
        active: false,
      });
    });
  });

  describe('getByToken', () => {
    beforeEach(async () => {
      await loadFixtures([
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          token: 'qwerty',
        },
        {
          active: true,
          type: TokenType.ACCESS_TOKEN,
          token: 'azerty',
        },
      ]);
    });

    it('allow to find a token', async () => {
      const token = await adapter.getByToken('azerty');
      expect(token).toBeDefined();
      expect((token as Token).token).toBe('azerty');
    });

    it('return null if the token does not exists', async () => {
      const token = await adapter.getByToken('idonotexists');
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
          token: 'qwerty',
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
