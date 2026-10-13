/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/order
import { mockGetFakeKibanaRequest, mockValidateKibanaPrivileges } from './api_keys.test.mock';

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { inspect } from 'util';

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { SERVICE_ACCOUNT_REALM_TYPE } from '@kbn/core-security-common';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import type { Logger } from '@kbn/logging';

import { APIKeys } from './api_keys';
import type { SecurityLicense } from '../../../common';
import { ALL_SPACES_ID } from '../../../common/constants';
import { licenseMock } from '../../../common/licensing/index.mock';
import { uiamServiceMock } from '../../uiam/uiam_service.mock';

const encodeToBase64 = (str: string) => Buffer.from(str).toString('base64');

describe('API Keys', () => {
  let apiKeys: APIKeys;
  let mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let mockScopedClusterClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let logger: Logger;
  const roleDescriptors: { [key: string]: any } = { foo: true };

  beforeEach(() => {
    mockValidateKibanaPrivileges.mockReset().mockReturnValue({ validationErrors: [] });
    mockGetFakeKibanaRequest.mockReset().mockReturnValue(httpServerMock.createKibanaRequest());

    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);

    logger = loggingSystemMock.create().get('api-keys');

    apiKeys = new APIKeys({
      clusterClient: mockClusterClient,
      logger,
      license: mockLicense,
      applicationName: 'kibana-.kibana',
      kibanaFeatures: [],
    });
  });

  describe('areAPIKeysEnabled()', () => {
    it('returns false when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      const result = await apiKeys.areAPIKeysEnabled();
      expect(result).toEqual(false);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).not.toHaveBeenCalled();
      expect(
        mockScopedClusterClient.asCurrentUser.security.invalidateApiKey
      ).not.toHaveBeenCalled();
    });

    it('returns false when the exception metadata indicates api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {
        error: { 'disabled.feature': 'api_keys' },
      };
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      const result = await apiKeys.areAPIKeysEnabled();
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
      expect(result).toEqual(false);
    });

    it('returns true when the operation completes without error', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponse({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.areAPIKeysEnabled();
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
      expect(result).toEqual(true);
    });

    it('throws the original error when exception metadata does not indicate that api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {
        error: { 'disabled.feature': 'something_else' },
      };

      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      await expect(apiKeys.areAPIKeysEnabled()).rejects.toThrow(error);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
    });

    it('throws the original error when exception metadata does not contain `disabled.feature`', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {};

      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      await expect(apiKeys.areAPIKeysEnabled()).rejects.toThrow(error);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
    });

    it('throws the original error when exception contains no metadata', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();

      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      await expect(apiKeys.areAPIKeysEnabled()).rejects.toThrow(error);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
    });

    it('calls `invalidateApiKey` with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });

      const result = await apiKeys.areAPIKeysEnabled();
      expect(result).toEqual(true);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledWith({
        ids: ['kibana-api-key-service-test'],
      });
    });
  });

  describe('areCrossClusterAPIKeysEnabled()', () => {
    it('returns false when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      const result = await apiKeys.areCrossClusterAPIKeysEnabled();
      expect(result).toEqual(false);
      expect(mockClusterClient.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('returns false when the operation completes without error (which should never happen)', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.transport.request.mockResolvedValueOnce({});

      const result = await apiKeys.areCrossClusterAPIKeysEnabled();
      expect(result).toEqual(false);
      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
    });

    it('returns false when the exception metadata indicates cross cluster api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.transport.request.mockRejectedValueOnce({
        statusCode: 404,
      });

      const result = await apiKeys.areCrossClusterAPIKeysEnabled();
      expect(result).toEqual(false);
      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_security/cross_cluster/api_key/kibana-api-key-service-test',
        body: {},
      });
    });

    it('returns true when the exception metadata indicates cross cluster api keys are enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.transport.request.mockRejectedValueOnce({
        statusCode: 400,
        body: { error: { type: 'action_request_validation_exception' } },
      });

      const result = await apiKeys.areCrossClusterAPIKeysEnabled();
      expect(result).toEqual(true);
      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_security/cross_cluster/api_key/kibana-api-key-service-test',
        body: {},
      });
    });
  });

  describe('create()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.create(httpServerMock.createKibanaRequest(), {
        name: '',
        role_descriptors: {},
      });
      expect(result).toBeNull();
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).not.toHaveBeenCalled();
    });

    it('throws an error when kibana privilege validation fails', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockValidateKibanaPrivileges
        .mockReturnValueOnce({ validationErrors: ['error1'] }) // for descriptor1
        .mockReturnValueOnce({ validationErrors: [] }) // for descriptor2
        .mockReturnValueOnce({ validationErrors: ['error2'] }); // for descriptor3

      await expect(
        apiKeys.create(httpServerMock.createKibanaRequest(), {
          name: 'key-name',
          kibana_role_descriptors: {
            descriptor1: { elasticsearch: {}, kibana: [] },
            descriptor2: { elasticsearch: {}, kibana: [] },
            descriptor3: { elasticsearch: {}, kibana: [] },
          },
          expiration: '1d',
        })
      ).rejects.toEqual(
        // The validation errors from descriptor1 and descriptor3 are concatenated into the final error message
        new Error('API key cannot be created due to validation errors: ["error1","error2"]')
      );
      expect(mockValidateKibanaPrivileges).toHaveBeenCalledTimes(3);
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).not.toHaveBeenCalled();
    });

    it('calls `createApiKey` with proper parameters when type is `rest` or not defined', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.security.createApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        // @ts-expect-error @elastic/elsticsearch CreateApiKeyResponse.expiration: number
        expiration: '1d',
        api_key: 'abc123',
      });
      const result = await apiKeys.create(httpServerMock.createKibanaRequest(), {
        name: 'key-name',
        role_descriptors: roleDescriptors,
        expiration: '1d',
      });

      expect(result).toEqual({
        api_key: 'abc123',
        expiration: '1d',
        id: '123',
        name: 'key-name',
      });
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockScopedClusterClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
        name: 'key-name',
        role_descriptors: roleDescriptors,
        expiration: '1d',
      });
    });

    it('creates cross-cluster API key when type is `cross_cluster`', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        id: '123',
        name: 'key-name',
        expiration: '1d',
        api_key: 'abc123',
      });
      const result = await apiKeys.create(httpServerMock.createKibanaRequest(), {
        type: 'cross_cluster',
        name: 'key-name',
        expiration: '1d',
        access: {},
        metadata: {},
      });
      expect(result).toEqual({
        api_key: 'abc123',
        expiration: '1d',
        id: '123',
        name: 'key-name',
      });
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/cross_cluster/api_key',
        body: {
          name: 'key-name',
          expiration: '1d',
          access: {},
          metadata: {},
        },
      });
    });

    it('forwards `certificate_identity` when creating a cross-cluster API key', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
      });
      await apiKeys.create(httpServerMock.createKibanaRequest(), {
        type: 'cross_cluster',
        name: 'key-name',
        access: {},
        metadata: {},
        certificate_identity: 'CN=host,OU=engineering,DC=example,DC=com',
      });
      expect(mockScopedClusterClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/cross_cluster/api_key',
        body: {
          name: 'key-name',
          expiration: undefined,
          access: {},
          metadata: {},
          certificate_identity: 'CN=host,OU=engineering,DC=example,DC=com',
        },
      });
    });
  });

  describe('update()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.update(httpServerMock.createKibanaRequest(), {
        id: 'test_id',
        metadata: {},
        role_descriptors: {},
      });
      expect(result).toBeNull();
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.security.updateApiKey).not.toHaveBeenCalled();
    });

    it('throws an error when kibana privilege validation fails', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockValidateKibanaPrivileges
        .mockReturnValueOnce({ validationErrors: ['error1'] }) // for descriptor1
        .mockReturnValueOnce({ validationErrors: [] }) // for descriptor2
        .mockReturnValueOnce({ validationErrors: ['error2'] }); // for descriptor3

      await expect(
        apiKeys.update(httpServerMock.createKibanaRequest(), {
          id: 'test_id',
          kibana_role_descriptors: {
            descriptor1: { elasticsearch: {}, kibana: [] },
            descriptor2: { elasticsearch: {}, kibana: [] },
            descriptor3: { elasticsearch: {}, kibana: [] },
          },
        })
      ).rejects.toEqual(
        // The validation errors from descriptor1 and descriptor3 are concatenated into the final error message
        new Error('API key cannot be updated due to validation errors: ["error1","error2"]')
      );

      expect(mockValidateKibanaPrivileges).toHaveBeenCalledTimes(3);
      expect(mockScopedClusterClient.asCurrentUser.security.updateApiKey).not.toHaveBeenCalled();
    });

    it('calls `updateApiKey` with proper parameters and receives `updated: true` in the response', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.security.updateApiKey.mockResponseOnce({
        updated: true,
      });

      const result = await apiKeys.update(httpServerMock.createKibanaRequest(), {
        id: 'test_id',
        role_descriptors: roleDescriptors,
        metadata: {},
      });

      expect(result).toEqual({
        updated: true,
      });

      expect(logger.debug).toHaveBeenNthCalledWith(1, 'Trying to edit an API key');
      expect(logger.debug).toHaveBeenNthCalledWith(2, 'API key was updated successfully');
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockScopedClusterClient.asCurrentUser.security.updateApiKey).toHaveBeenCalledWith({
        id: 'test_id',
        role_descriptors: { foo: true },
        metadata: {},
      });
    });

    it('calls `updateApiKey` with proper parameters and receives `updated: false` in the response', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.security.updateApiKey.mockResponseOnce({
        updated: false,
      });

      const result = await apiKeys.update(httpServerMock.createKibanaRequest(), {
        id: 'test_id',
        role_descriptors: roleDescriptors,
        metadata: {},
      });

      expect(result).toEqual({
        updated: false,
      });

      expect(logger.debug).toHaveBeenNthCalledWith(1, 'Trying to edit an API key');
      expect(logger.debug).toHaveBeenNthCalledWith(2, 'There were no updates to make for API key');
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockScopedClusterClient.asCurrentUser.security.updateApiKey).toHaveBeenCalledWith({
        id: 'test_id',
        role_descriptors: { foo: true },
        metadata: {},
      });
    });

    it('updates cross-cluster API key when type is `cross_cluster`', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        updated: true,
      });
      const result = await apiKeys.update(httpServerMock.createKibanaRequest(), {
        type: 'cross_cluster',
        id: '123',
        access: {},
        metadata: {},
      });
      expect(result).toEqual({
        updated: true,
      });
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockScopedClusterClient.asCurrentUser.security.updateApiKey).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_security/cross_cluster/api_key/123',
        body: {
          access: {},
          metadata: {},
        },
      });
    });

    it('forwards `certificate_identity` when updating a cross-cluster API key', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        updated: true,
      });
      await apiKeys.update(httpServerMock.createKibanaRequest(), {
        type: 'cross_cluster',
        id: '123',
        access: {},
        metadata: {},
        certificate_identity: 'CN=host,OU=engineering,DC=example,DC=com',
      });
      expect(mockScopedClusterClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_security/cross_cluster/api_key/123',
        body: {
          access: {},
          metadata: {},
          certificate_identity: 'CN=host,OU=engineering,DC=example,DC=com',
        },
      });
    });
  });

  describe('grantAsInternalUser() with a service account token', () => {
    const serviceAccountToken = Buffer.concat([
      Buffer.from([0, 1, 0, 1]),
      Buffer.from('kibana/automation/t1:super-secret'),
    ])
      .toString('base64')
      .replace(/=+$/, '');
    const serviceAccountUser = mockAuthenticatedUser({
      username: 'kibana/automation',
      authentication_provider: { type: 'http', name: '__http__' },
      authentication_realm: { name: SERVICE_ACCOUNT_REALM_TYPE, type: SERVICE_ACCOUNT_REALM_TYPE },
      lookup_realm: { name: SERVICE_ACCOUNT_REALM_TYPE, type: SERVICE_ACCOUNT_REALM_TYPE },
      authentication_type: 'token',
      http_authentication_scheme: 'bearer',
    });
    const grantResult = { id: '123', name: 'key-name', api_key: 'abc123', encoded: 'utf8' };
    let getCurrentUser: jest.Mock;

    const createServiceAccountRequest = (headers: Record<string, string> = {}) =>
      httpServerMock.createKibanaRequest({
        headers: { authorization: `Bearer ${serviceAccountToken}`, ...headers },
      });

    const createResponseError = (statusCode: number, reason: string) => {
      const response = elasticsearchServiceMock.createApiResponse({
        statusCode,
        body: { error: { type: 'security_exception', reason } },
      });
      response.meta.request = {
        id: 'grant',
        options: {},
        params: {
          method: 'POST',
          path: '/_security/api_key/grant',
          body: JSON.stringify({ service_account_token: serviceAccountToken }),
        },
      };
      return new errors.ResponseError(response);
    };

    beforeEach(() => {
      getCurrentUser = jest.fn().mockReturnValue(serviceAccountUser);
      apiKeys = new APIKeys({
        clusterClient: mockClusterClient,
        logger,
        license: mockLicense,
        applicationName: 'kibana-.kibana',
        kibanaFeatures: [],
        serviceAccountsEnabled: true,
        getCurrentUser,
      });
    });

    it('grants with the service account grant type and no client authentication', async () => {
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce(grantResult);

      const result = await apiKeys.grantAsInternalUser(
        createServiceAccountRequest({ 'es-client-authentication': 'SharedSecret secret' }),
        { name: 'test_api_key', role_descriptors: roleDescriptors, expiration: '1d' }
      );

      expect(result).toEqual(grantResult);
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
        grant_type: '_user_managed_service_account',
        service_account_token: serviceAccountToken,
        api_key: { name: 'test_api_key', role_descriptors: roleDescriptors, expiration: '1d' },
      });
    });

    it('forwards `refresh`', async () => {
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce(grantResult);

      await apiKeys.grantAsInternalUser(
        createServiceAccountRequest(),
        { name: 'test_api_key', role_descriptors: {} },
        { refresh: 'wait_for' }
      );

      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          grant_type: '_user_managed_service_account',
          refresh: 'wait_for',
        })
      );
    });

    it('grants the token as an access token when service accounts are disabled', async () => {
      apiKeys = new APIKeys({
        clusterClient: mockClusterClient,
        logger,
        license: mockLicense,
        applicationName: 'kibana-.kibana',
        kibanaFeatures: [],
        getCurrentUser,
      });
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce(grantResult);

      await apiKeys.grantAsInternalUser(createServiceAccountRequest(), {
        name: 'test_api_key',
        role_descriptors: {},
      });

      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith(
        expect.objectContaining({ grant_type: 'access_token', access_token: serviceAccountToken })
      );
    });

    it('grants other bearer tokens as access tokens', async () => {
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce(grantResult);

      await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: { authorization: 'Bearer dGhpcyBpcyBhbiBhY2Nlc3MgdG9rZW4=' },
        }),
        { name: 'test_api_key', role_descriptors: {} }
      );

      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          grant_type: 'access_token',
          access_token: 'dGhpcyBpcyBhbiBhY2Nlc3MgdG9rZW4=',
        })
      );
    });

    it.each([
      [400, '[service_account_token] must belong to a user-managed service account'],
      [403, 'Failed to authenticate api key grant'],
    ])('maps a %s refusal to an error that names the account', async (statusCode, reason) => {
      mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValueOnce(
        createResponseError(statusCode, reason)
      );

      const failure = await apiKeys
        .grantAsInternalUser(createServiceAccountRequest(), {
          name: 'test_api_key',
          role_descriptors: {},
        })
        .catch((error: Boom.Boom) => error);

      expect(Boom.isBoom(failure)).toBe(true);
      expect((failure as Boom.Boom).output.statusCode).toBe(statusCode);
      expect((failure as Boom.Boom).message).toBe(
        `Unable to grant an API key for service account [kibana/automation]: ${reason}`
      );
    });

    it('maps a 401 to a 403, since Kibana already authenticated the caller', async () => {
      mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValueOnce(
        createResponseError(401, 'unable to authenticate')
      );

      const failure = await apiKeys
        .grantAsInternalUser(createServiceAccountRequest(), {
          name: 'test_api_key',
          role_descriptors: {},
        })
        .catch((error: Boom.Boom) => error);

      expect((failure as Boom.Boom).output.statusCode).toBe(403);
    });

    it('logs a refusal as a warning and a server error as an error', async () => {
      mockClusterClient.asInternalUser.security.grantApiKey
        .mockRejectedValueOnce(createResponseError(400, 'refused'))
        .mockRejectedValueOnce(createResponseError(503, 'unavailable'));
      const grant = () =>
        apiKeys
          .grantAsInternalUser(createServiceAccountRequest(), {
            name: 'test_api_key',
            role_descriptors: {},
          })
          .catch(() => undefined);

      await grant();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();

      await grant();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('explains the refusal when service accounts are disabled', async () => {
      apiKeys = new APIKeys({
        clusterClient: mockClusterClient,
        logger,
        license: mockLicense,
        applicationName: 'kibana-.kibana',
        kibanaFeatures: [],
        getCurrentUser,
      });
      mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValueOnce(
        createResponseError(403, 'Failed to authenticate api key grant')
      );

      const failure = await apiKeys
        .grantAsInternalUser(createServiceAccountRequest(), {
          name: 'test_api_key',
          role_descriptors: {},
        })
        .catch((error: Boom.Boom) => error);

      expect((failure as Boom.Boom).output.statusCode).toBe(403);
      expect((failure as Boom.Boom).message).toBe(
        'Unable to grant an API key for service account [kibana/automation]: Kibana grants API ' +
          'keys from service account tokens only when `xpack.security.serviceAccounts.enabled` ' +
          'is `true`'
      );
    });

    it('keeps the status of a server error without exposing the original error', async () => {
      const sourceError = createResponseError(503, 'unavailable');
      mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValueOnce(sourceError);

      const failure = await apiKeys
        .grantAsInternalUser(createServiceAccountRequest(), {
          name: 'test_api_key',
          role_descriptors: {},
        })
        .catch((error: Boom.Boom) => error);

      expect(failure).not.toBe(sourceError);
      expect(Boom.isBoom(failure)).toBe(true);
      expect((failure as Boom.Boom).output.statusCode).toBe(503);
    });

    it('keeps the original error when the caller is not a service account', async () => {
      getCurrentUser.mockReturnValue(mockAuthenticatedUser());
      const sourceError = createResponseError(401, 'unable to authenticate');
      mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValueOnce(sourceError);

      await expect(
        apiKeys.grantAsInternalUser(
          httpServerMock.createKibanaRequest({ headers: { authorization: 'Bearer foo' } }),
          { name: 'test_api_key', role_descriptors: {} }
        )
      ).rejects.toBe(sourceError);
    });

    it.each([400, 403, 503, 'connection'] as const)(
      'never logs or throws the token (%s)',
      async (failureKind) => {
        mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValueOnce(
          failureKind === 'connection'
            ? new errors.ConnectionError(
                'Disconnected',
                createResponseError(503, 'unavailable').meta
              )
            : createResponseError(failureKind, 'refused')
        );

        const failure = await apiKeys
          .grantAsInternalUser(createServiceAccountRequest(), {
            name: 'test_api_key',
            role_descriptors: {},
          })
          .catch((error: Error) => error);

        const tokenSecret = 'super-secret';
        expect(
          inspect(failure, { depth: null, showHidden: true, customInspect: false })
        ).not.toContain(serviceAccountToken);
        for (const calls of Object.values(loggingSystemMock.collect(logger))) {
          expect(JSON.stringify(calls)).not.toContain(serviceAccountToken);
          expect(JSON.stringify(calls)).not.toContain(tokenSecret);
        }
      }
    );
  });

  describe('grantAsInternalUser()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.grantAsInternalUser(httpServerMock.createKibanaRequest(), {
        name: 'test_api_key',
        role_descriptors: {},
      });
      expect(result).toBeNull();
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled();
      expect(mockClusterClient.asInternalUser.security.grantApiKey).not.toHaveBeenCalled();
    });

    it('throws an error when request does not contain authorization header', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      await expect(
        apiKeys.grantAsInternalUser(httpServerMock.createKibanaRequest(), {
          name: 'test_api_key',
          role_descriptors: {},
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to grant an API Key, request does not contain an authorization header"`
      );
      expect(mockClusterClient.asInternalUser.security.grantApiKey).not.toHaveBeenCalled();
    });

    it('throws an error when grantApiKey fails', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error('Elasticsearch error');
      mockClusterClient.asInternalUser.security.grantApiKey.mockRejectedValue(error);

      await expect(
        apiKeys.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: { authorization: `Bearer foo-access-token` },
          }),
          {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
          }
        )
      ).rejects.toThrow('Elasticsearch error');
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledTimes(1);
    });

    it('throws an error when kibana privilege validation fails', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockValidateKibanaPrivileges
        .mockReturnValueOnce({ validationErrors: ['error1'] }) // for descriptor1
        .mockReturnValueOnce({ validationErrors: [] }) // for descriptor2
        .mockReturnValueOnce({ validationErrors: ['error2'] }); // for descriptor3

      await expect(
        apiKeys.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: { authorization: `Basic ${encodeToBase64('foo:bar')}` },
          }),
          {
            name: 'key-name',
            kibana_role_descriptors: {
              descriptor1: { elasticsearch: {}, kibana: [] },
              descriptor2: { elasticsearch: {}, kibana: [] },
              descriptor3: { elasticsearch: {}, kibana: [] },
            },
            expiration: '1d',
          }
        )
      ).rejects.toEqual(
        // The validation errors from descriptor1 and descriptor3 are concatenated into the final error message
        new Error('API key cannot be created due to validation errors: ["error1","error2"]')
      );
      expect(mockValidateKibanaPrivileges).toHaveBeenCalledTimes(3);
      expect(mockClusterClient.asInternalUser.security.grantApiKey).not.toHaveBeenCalled();
    });

    it('calls `grantApiKey` with proper parameters for the Basic scheme', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        // @ts-expect-error invalid definition
        expires: '1d',
      });
      const result = await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: { authorization: `Basic ${encodeToBase64('foo:bar')}` },
        }),
        {
          name: 'test_api_key',
          role_descriptors: roleDescriptors,
          expiration: '1d',
        }
      );
      expect(result).toEqual({
        api_key: 'abc123',
        id: '123',
        name: 'key-name',
        expires: '1d',
      });
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
        api_key: {
          name: 'test_api_key',
          role_descriptors: { foo: true },
          expiration: '1d',
        },
        grant_type: 'password',
        username: 'foo',
        password: 'bar',
      });
    });

    it('forwards refresh when provided and omits it otherwise', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponse({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        encoded: 'utf8',
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: `Basic ${encodeToBase64('foo:bar')}` },
      });
      const createParams = {
        name: 'test_api_key',
        role_descriptors: roleDescriptors,
      };

      await apiKeys.grantAsInternalUser(request, createParams);
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ refresh: expect.anything() })
      );

      await apiKeys.grantAsInternalUser(request, createParams, { refresh: false });
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenLastCalledWith(
        expect.objectContaining({ refresh: false })
      );
    });

    it('calls `grantApiKey` with proper parameters for the Bearer scheme', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        encoded: 'utf8',
      });
      const result = await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: { authorization: `Bearer foo-access-token` },
        }),
        {
          name: 'test_api_key',
          role_descriptors: roleDescriptors,
          expiration: '1d',
        }
      );
      expect(result).toEqual({
        api_key: 'abc123',
        id: '123',
        name: 'key-name',
        encoded: 'utf8',
      });
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
        api_key: {
          name: 'test_api_key',
          role_descriptors: roleDescriptors,
          expiration: '1d',
        },
        grant_type: 'access_token',
        access_token: 'foo-access-token',
      });
    });

    it('calls `grantApiKey` with proper parameters for the Bearer scheme with client authentication', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        encoded: 'utf8',
      });
      const result = await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: {
            authorization: `Bearer foo-access-token`,
            'es-client-authentication': 'SharedSecret secret',
          },
        }),
        {
          name: 'test_api_key',
          role_descriptors: roleDescriptors,
          expiration: '1d',
        }
      );
      expect(result).toEqual({
        api_key: 'abc123',
        id: '123',
        name: 'key-name',
        encoded: 'utf8',
      });
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled(); // this is only called if kibana_role_descriptors is defined
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
        api_key: {
          name: 'test_api_key',
          role_descriptors: { foo: true },
          expiration: '1d',
        },
        grant_type: 'access_token',
        access_token: 'foo-access-token',
        client_authentication: {
          scheme: 'SharedSecret',
          value: 'secret',
        },
      });
    });

    it('throw error for other schemes', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      await expect(
        apiKeys.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: {
              authorization: `Digest username="foo"`,
            },
          }),
          {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          }
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unsupported scheme \\"Digest\\" for granting API Key"`
      );
      expect(mockValidateKibanaPrivileges).not.toHaveBeenCalled();
      expect(mockClusterClient.asInternalUser.security.grantApiKey).not.toHaveBeenCalled();
    });

    describe('with UIAM', () => {
      it('resolves client authentication from the request in an ES API key grant', async () => {
        const mockUiam = uiamServiceMock.create();
        // The UIAM service preserves the client authentication supplied with the request; see the
        // `getClientAuthentication` tests in `uiam_service.test.ts`.
        mockUiam.getClientAuthentication.mockReturnValue({
          scheme: 'SharedSecret',
          value: 'upstream-shared-secret',
        });
        const apiKeysWithUiam = new APIKeys({
          clusterClient: mockClusterClient,
          logger,
          license: mockLicense,
          applicationName: 'kibana-.kibana',
          kibanaFeatures: [],
          uiam: mockUiam,
        });
        mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
          id: '123',
          name: 'key-name',
          api_key: 'abc123',
          encoded: 'utf8',
        });
        const request = httpServerMock.createKibanaRequest({
          headers: {
            authorization: 'Bearer essu_ephemeral_token',
            'x-client-authentication': 'upstream-shared-secret',
          },
        });

        await apiKeysWithUiam.grantAsInternalUser(request, {
          name: 'test-key',
          role_descriptors: {},
        });

        expect(mockUiam.getClientAuthentication).toHaveBeenCalledWith(request);
        expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
          api_key: { name: 'test-key', role_descriptors: {} },
          grant_type: 'access_token',
          access_token: 'essu_ephemeral_token',
          client_authentication: { scheme: 'SharedSecret', value: 'upstream-shared-secret' },
        });
      });

      it('uses UIAM client authentication when credentials are UIAM credentials', async () => {
        const mockUiam = uiamServiceMock.create();
        mockUiam.getClientAuthentication.mockReturnValue({
          scheme: 'SharedSecret',
          value: 'uiam-shared-secret',
        });
        const apiKeysWithUiam = new APIKeys({
          clusterClient: mockClusterClient,
          logger,
          license: mockLicense,
          applicationName: 'kibana-.kibana',
          kibanaFeatures: [],
          uiam: mockUiam,
        });

        mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
          id: '123',
          name: 'key-name',
          api_key: 'abc123',
          encoded: 'utf8',
        });

        const result = await apiKeysWithUiam.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: {
              authorization: `Bearer essu_uiam_access_token`,
            },
          }),
          {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          }
        );

        expect(result).toEqual({
          api_key: 'abc123',
          id: '123',
          name: 'key-name',
          encoded: 'utf8',
        });
        expect(mockUiam.getClientAuthentication).toHaveBeenCalled();
        expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
          api_key: {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          },
          grant_type: 'access_token',
          access_token: 'essu_uiam_access_token',
          client_authentication: {
            scheme: 'SharedSecret',
            value: 'uiam-shared-secret',
          },
        });
      });

      it('ignores es-client-authentication header when credentials are UIAM credentials', async () => {
        const mockUiam = uiamServiceMock.create();
        mockUiam.getClientAuthentication.mockReturnValue({
          scheme: 'SharedSecret',
          value: 'uiam-shared-secret',
        });
        const apiKeysWithUiam = new APIKeys({
          clusterClient: mockClusterClient,
          logger,
          license: mockLicense,
          applicationName: 'kibana-.kibana',
          kibanaFeatures: [],
          uiam: mockUiam,
        });

        mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
          id: '123',
          name: 'key-name',
          api_key: 'abc123',
          encoded: 'utf8',
        });

        await apiKeysWithUiam.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: {
              authorization: `Bearer essu_uiam_access_token`,
              'es-client-authentication': 'SharedSecret should-be-ignored',
            },
          }),
          {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          }
        );

        // Should use UIAM client authentication, not the es-client-authentication header
        expect(mockUiam.getClientAuthentication).toHaveBeenCalled();
        expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
          api_key: {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          },
          grant_type: 'access_token',
          access_token: 'essu_uiam_access_token',
          client_authentication: {
            scheme: 'SharedSecret',
            value: 'uiam-shared-secret',
          },
        });
      });

      it('uses es-client-authentication header when UIAM is configured but credentials are not UIAM credentials', async () => {
        const mockUiam = uiamServiceMock.create();
        const apiKeysWithUiam = new APIKeys({
          clusterClient: mockClusterClient,
          logger,
          license: mockLicense,
          applicationName: 'kibana-.kibana',
          kibanaFeatures: [],
          uiam: mockUiam,
        });

        mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
          id: '123',
          name: 'key-name',
          api_key: 'abc123',
          encoded: 'utf8',
        });

        await apiKeysWithUiam.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: {
              authorization: `Bearer regular_access_token`,
              'es-client-authentication': 'SharedSecret header-secret',
            },
          }),
          {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          }
        );

        // Should NOT use UIAM client authentication since credentials are not UIAM credentials
        expect(mockUiam.getClientAuthentication).not.toHaveBeenCalled();
        expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
          api_key: {
            name: 'test_api_key',
            role_descriptors: roleDescriptors,
            expiration: '1d',
          },
          grant_type: 'access_token',
          access_token: 'regular_access_token',
          client_authentication: {
            scheme: 'SharedSecret',
            value: 'header-secret',
          },
        });
      });
    });
  });

  describe('cloneAsInternalUser()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.cloneAsInternalUser(httpServerMock.createKibanaRequest(), {
        name: 'cloned-key',
      });
      expect(result).toBeNull();
    });

    it('throws when request has no authorization header', async () => {
      await expect(
        apiKeys.cloneAsInternalUser(httpServerMock.createKibanaRequest(), {
          name: 'cloned-key',
        })
      ).rejects.toThrow('request does not contain an authorization header');
    });

    it('throws when authorization scheme is not ApiKey', async () => {
      await expect(
        apiKeys.cloneAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: { authorization: `Bearer some-token` },
          }),
          { name: 'cloned-key' }
        )
      ).rejects.toThrow('expected ApiKey authorization scheme');
    });

    it('calls ES clone endpoint with correct parameters', async () => {
      const apiKeyCredentials = encodeToBase64('key-id:key-secret');
      mockClusterClient.asInternalUser.transport.request.mockResolvedValueOnce({
        id: 'cloned-id',
        name: 'cloned-key',
        api_key: 'cloned-secret',
        encoded: encodeToBase64('cloned-id:cloned-secret'),
      });

      const result = await apiKeys.cloneAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: { authorization: `ApiKey ${apiKeyCredentials}` },
        }),
        { name: 'cloned-key', metadata: { managed: true } }
      );

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/api_key/clone',
        body: {
          api_key: apiKeyCredentials,
          name: 'cloned-key',
          metadata: { managed: true },
          expiration: null,
        },
      });

      expect(result).toEqual({
        id: 'cloned-id',
        name: 'cloned-key',
        api_key: 'cloned-secret',
        encoded: encodeToBase64('cloned-id:cloned-secret'),
      });
    });

    it('calls ES clone endpoint without metadata when not provided', async () => {
      const apiKeyCredentials = encodeToBase64('key-id:key-secret');
      mockClusterClient.asInternalUser.transport.request.mockResolvedValueOnce({
        id: 'cloned-id',
        name: 'cloned-key',
        api_key: 'cloned-secret',
        encoded: encodeToBase64('cloned-id:cloned-secret'),
      });

      await apiKeys.cloneAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: { authorization: `ApiKey ${apiKeyCredentials}` },
        }),
        { name: 'cloned-key' }
      );

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/api_key/clone',
        body: {
          api_key: apiKeyCredentials,
          name: 'cloned-key',
          expiration: null,
        },
      });
    });

    it('throws when ES clone endpoint fails', async () => {
      const apiKeyCredentials = encodeToBase64('key-id:key-secret');
      mockClusterClient.asInternalUser.transport.request.mockRejectedValueOnce(
        new Error('Clone not supported')
      );

      await expect(
        apiKeys.cloneAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: { authorization: `ApiKey ${apiKeyCredentials}` },
          }),
          { name: 'cloned-key' }
        )
      ).rejects.toThrow('Clone not supported');
    });
  });

  describe('invalidate()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        ids: ['123'],
      });
      expect(result).toBeNull();
      expect(
        mockScopedClusterClient.asCurrentUser.security.invalidateApiKey
      ).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.asCurrentUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        ids: ['123'],
      });
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockScopedClusterClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
        ids: ['123'],
      });
    });

    it(`Only passes ids as a parameter`, async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.asCurrentUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        ids: ['123'],
        name: 'abc',
      } as any);
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockScopedClusterClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
        ids: ['123'],
      });
    });
  });

  describe('validate()', () => {
    it('returns false when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.validate({
        id: '123',
        api_key: 'abc123',
      });
      expect(result).toEqual(false);
      expect(mockClusterClient.asScoped).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockGetFakeKibanaRequest.mockReturnValue(request);
      mockLicense.isEnabled.mockReturnValue(true);
      const params = {
        id: '123',
        api_key: 'abc123',
      };
      const result = await apiKeys.validate(params);
      expect(result).toEqual(true);

      expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
      expect(
        mockClusterClient.asScoped().asCurrentUser.security.authenticate
      ).toHaveBeenCalledWith();
    });

    it('returns false if cannot authenticate with the API key', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockGetFakeKibanaRequest.mockReturnValue(request);
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(new Error());
      const params = { id: '123', api_key: 'abc123' };

      await expect(apiKeys.validate(params)).resolves.toEqual(false);

      expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
      expect(
        mockClusterClient.asScoped().asCurrentUser.security.authenticate
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateAsInternalUser()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.invalidateAsInternalUser({ ids: ['123'] });
      expect(result).toBeNull();
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidateAsInternalUser({ ids: ['123'] });
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledWith({
        ids: ['123'],
      });
    });

    it('Only passes ids as a parameter', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidateAsInternalUser({
        ids: ['123'],
        name: 'abc',
      } as any);
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledWith({
        ids: ['123'],
      });
    });
  });

  describe('with kibana privileges', () => {
    it('creates api key with application privileges', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.security.createApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        // @ts-expect-error @elastic/elsticsearch CreateApiKeyResponse.expiration: number
        expiration: '1d',
        api_key: 'abc123',
      });
      const result = await apiKeys.create(httpServerMock.createKibanaRequest(), {
        name: 'key-name',
        kibana_role_descriptors: {
          synthetics_writer: {
            elasticsearch: { cluster: ['manage'], indices: [], run_as: [] },
            kibana: [
              {
                base: [],
                spaces: [ALL_SPACES_ID],
                feature: {
                  uptime: ['all'],
                },
              },
            ],
          },
        },
        expiration: '1d',
      });
      expect(result).toEqual({
        api_key: 'abc123',
        expiration: '1d',
        id: '123',
        name: 'key-name',
      });
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
        name: 'key-name',
        role_descriptors: {
          synthetics_writer: {
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['feature_uptime.all'],
                resources: ['*'],
              },
            ],
            cluster: ['manage'],
            indices: [],
            run_as: [],
          },
        },
        expiration: '1d',
      });
    });

    it('creates api key with application privileges as internal user', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        // @ts-expect-error invalid definition
        expires: '1d',
      });
      const result = await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: {
            authorization: `Basic ${encodeToBase64('foo:bar')}`,
          },
        }),
        {
          name: 'key-name',
          kibana_role_descriptors: {
            synthetics_writer: {
              elasticsearch: {
                cluster: ['manage'],
                indices: [],
                run_as: [],
              },
              kibana: [
                {
                  base: [],
                  spaces: [ALL_SPACES_ID],
                  feature: {
                    uptime: ['all'],
                  },
                },
              ],
            },
          },
          expiration: '1d',
        }
      );
      expect(result).toEqual({
        api_key: 'abc123',
        expires: '1d',
        id: '123',
        name: 'key-name',
      });
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
        api_key: {
          name: 'key-name',
          role_descriptors: {
            synthetics_writer: {
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['feature_uptime.all'],
                  resources: ['*'],
                },
              ],
              cluster: ['manage'],
              indices: [],
              run_as: [],
            },
          },
          expiration: '1d',
        },
        grant_type: 'password',
        password: 'bar',
        username: 'foo',
      });
    });

    it('updates api key with application privileges', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.security.updateApiKey.mockResponseOnce({
        updated: true,
      });
      const result = await apiKeys.update(httpServerMock.createKibanaRequest(), {
        id: 'test_id',
        kibana_role_descriptors: {
          synthetics_writer: {
            elasticsearch: { cluster: ['manage'], indices: [], run_as: [] },
            kibana: [
              {
                base: [],
                spaces: [ALL_SPACES_ID],
                feature: {
                  uptime: ['all'],
                },
              },
            ],
          },
        },
        metadata: {},
      });

      expect(result).toEqual({
        updated: true,
      });

      expect(mockScopedClusterClient.asCurrentUser.security.updateApiKey).toHaveBeenCalledWith({
        id: 'test_id',
        role_descriptors: {
          synthetics_writer: {
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['feature_uptime.all'],
                resources: ['*'],
              },
            ],
            cluster: ['manage'],
            indices: [],
            run_as: [],
          },
        },
        metadata: {},
      });
    });
  });
});
