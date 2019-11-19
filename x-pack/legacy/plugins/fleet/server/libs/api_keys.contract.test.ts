/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import uuid from 'uuid';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { MemorizeSODatabaseAdapter } from '../adapters/saved_objects_database/memorize_adapter';
import { SODatabaseAdapter } from '../adapters/saved_objects_database/default';
import { FleetServerLib } from './types';
import { compose } from './compose/memorized';
import { MemorizedElasticsearchAdapter } from '../adapters/elasticsearch/memorize_adapter';
import { ElasticsearchAdapter } from '../adapters/elasticsearch/default';

jest.mock('./framework');

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

function apiKeyToString(apiKey: { id: string; api_key: string }) {
  return Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64');
}

function getUserForApiKey(apiKey: { id: string; api_key: string }) {
  return {
    kind: 'authenticated',
    [internalAuthData]: {
      headers: {
        authorization: `ApiKey ${apiKeyToString(apiKey)}`,
      },
    },
  } as FrameworkUser;
}

describe('ApiKeys Lib', () => {
  let servers: any;
  let soAdapter: MemorizeSODatabaseAdapter;
  let esAdapter: MemorizedElasticsearchAdapter;
  let libs: FleetServerLib;

  async function clearFixtures() {
    const { saved_objects: savedObjects } = await soAdapter.find(getUser(), {
      type: 'enrollment_api_keys',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(getUser(), 'enrollment_api_keys', so.id);
    }
  }

  async function createESApiKey() {
    return await esAdapter.createApiKey(getUser(), {
      name: `TEST API KEY: ${uuid.v4()}`,
    });
  }
  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });
      esAdapter = new MemorizedElasticsearchAdapter(
        new ElasticsearchAdapter(servers.kbnServer.plugins.elasticsearch)
      );
      soAdapter = new MemorizeSODatabaseAdapter(
        new SODatabaseAdapter(
          servers.kbnServer.savedObjects,
          servers.kbnServer.plugins.elasticsearch
        )
      );
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
    if (!esAdapter) {
      esAdapter = new MemorizedElasticsearchAdapter();
    }
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });
  beforeEach(async () => {
    await clearFixtures();
    libs = compose(servers ? servers.kbnServer : undefined);
  });
  describe('verifyAccessApiKey', () => {
    it('should verify a valid api key', async () => {
      const { apiKeys } = libs;
      const apiKey = await createESApiKey();

      const res = await apiKeys.verifyAccessApiKey(getUserForApiKey(apiKey));
      expect(res).toMatchObject({
        valid: true,
      });
    });
    it('should not verify invalid ApiKey', async () => {
      const { apiKeys } = libs;
      const res = await apiKeys.verifyAccessApiKey(
        getUserForApiKey({ id: 'invalid', api_key: 'NOT_A_VALID_API_KEY' })
      );
      expect(res).toMatchObject({
        valid: false,
        reason: 'ApiKey is not valid',
      });
    });
  });
  describe('verifyEnrollmentApiKey', () => {
    it('should verify a valid api key', async () => {
      const { apiKeys } = libs;
      const apiKey = await createESApiKey();
      await soAdapter.create(getUser(), 'enrollment_api_keys', {
        active: true,
        api_key_id: apiKey.id,
        api_key: apiKeyToString(apiKey),
      });

      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey(apiKey));

      expect(res).toMatchObject({
        valid: true,
      });
    });

    it('should not verify a inactive enrollemnt api key', async () => {
      const { apiKeys } = libs;
      const apiKey = await createESApiKey();
      await soAdapter.create(getUser(), 'enrollment_api_keys', {
        active: false,
        api_key_id: apiKey.id,
        api_key: apiKeyToString(apiKey),
      });

      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey(apiKey));

      expect(res).toMatchObject({
        valid: false,
        reason: 'Enrollement api key does not exists or is not active',
      });
    });

    it('should not verify a inactive an enrollemnt api key not persisted', async () => {
      const { apiKeys } = libs;
      const apiKey = await createESApiKey();
      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey(apiKey));

      expect(res).toMatchObject({
        valid: false,
        reason: 'Enrollement api key does not exists or is not active',
      });
    });

    it('should not verify invalid ApiKey', async () => {
      const { apiKeys } = libs;
      const res = await apiKeys.verifyEnrollmentApiKey(
        getUserForApiKey({ id: 'not valid', api_key: 'invalid' })
      );
      expect(res).toMatchObject({
        valid: false,
        reason: 'ApiKey is not valid',
      });
    });
  });

  describe('generateEnrollmentApiKey', () => {
    it('should generate a valid ApiKey', async () => {
      const { apiKeys } = libs;

      const apiKey = await apiKeys.generateEnrollmentApiKey(getUser(), {
        policyId: 'policy1',
      });

      expect(apiKey).toBeDefined();
    });
  });
});
