/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiKeyLib } from './api_keys';
import { FrameworkLib } from './framework';
import { MemoryEnrollmentApiKeysRepository } from '../repositories/enrollment_api_keys/memory';
import { FrameworkAdapter } from '../adapters/framework/default';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { InMemoryElasticsearchAdapter } from '../adapters/elasticsearch/in_memory';

jest.mock('./framework');

function getUser() {
  return {} as FrameworkUser;
}

function getUserForApiKey(apiKey: string) {
  return {
    kind: 'authenticated',
    [internalAuthData]: {
      authorization: `ApiKey ${apiKey}`,
    },
  } as FrameworkUser;
}

function compose() {
  const enrollmentApiKeyRepository = new MemoryEnrollmentApiKeysRepository();
  const esAdapter = new InMemoryElasticsearchAdapter();
  const apiKeys = new ApiKeyLib(
    enrollmentApiKeyRepository,
    esAdapter,
    new FrameworkLib({} as FrameworkAdapter)
  );

  return { apiKeys, enrollmentApiKeyRepository, esAdapter };
}

describe('ApiKeys Lib', () => {
  describe('verifyAccessApiKey', () => {
    it('should verify a valid api key', async () => {
      const { apiKeys, esAdapter } = compose();
      const apiKey = await esAdapter.createApiKey(getUser(), {
        name: 'test-api-key',
      });

      const res = await apiKeys.verifyAccessApiKey(getUserForApiKey(apiKey.api_key));

      expect(res).toMatchObject({
        valid: true,
      });
    });
    it('should not verify invalid token', async () => {
      const { apiKeys, esAdapter } = compose();
      esAdapter.authenticate = () => {
        throw new Error('token not valid');
      };
      const res = await apiKeys.verifyAccessApiKey(getUserForApiKey('NOT_A_VALID_API_KEY'));
      expect(res).toMatchObject({
        valid: false,
        reason: 'token not valid',
      });
    });
  });
  describe('verifyEnrollmentApiKey', () => {
    it('should verify a valid api key', async () => {
      const { apiKeys, esAdapter, enrollmentApiKeyRepository } = compose();
      const apiKey = await esAdapter.createApiKey(getUser(), {
        name: 'test-api-key',
      });
      enrollmentApiKeyRepository.create(getUser(), {
        active: true,
        apiKeyId: apiKey.id,
        apiKey: apiKey.api_key,
      });

      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey(apiKey.api_key));

      expect(res).toMatchObject({
        valid: true,
      });
    });

    it('should not verify a inactive enrollemnt api key', async () => {
      const { apiKeys, esAdapter, enrollmentApiKeyRepository } = compose();
      const apiKey = await esAdapter.createApiKey(getUser(), {
        name: 'test-api-key',
      });
      enrollmentApiKeyRepository.create(getUser(), {
        active: false,
        apiKeyId: apiKey.id,
        apiKey: apiKey.api_key,
      });

      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey(apiKey.api_key));

      expect(res).toMatchObject({
        valid: false,
        reason: 'Enrollement api key does not exists or is not active',
      });
    });

    it('should not verify a inactive an enrollemnt api key not persisted', async () => {
      const { apiKeys, esAdapter } = compose();
      const apiKey = await esAdapter.createApiKey(getUser(), {
        name: 'test-api-key',
      });
      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey(apiKey.api_key));

      expect(res).toMatchObject({
        valid: false,
        reason: 'Enrollement api key does not exists or is not active',
      });
    });

    it('should not verify invalid token', async () => {
      const { apiKeys, esAdapter } = compose();
      esAdapter.authenticate = () => {
        throw new Error('token not valid');
      };
      const res = await apiKeys.verifyEnrollmentApiKey(getUserForApiKey('NOT_A_VALID_API_KEY'));
      expect(res).toMatchObject({
        valid: false,
        reason: 'token not valid',
      });
    });
  });

  describe('generateEnrollmentApiKey', () => {
    it('should generate a valid token', async () => {
      const { apiKeys } = compose();

      const apiKey = await apiKeys.generateEnrollmentApiKey(getUser(), {
        policyId: 'policy1',
      });

      expect(apiKey).toBeDefined();
    });
  });
});
