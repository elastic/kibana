/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type {
  CheckPrivileges,
  CheckPrivilegesResponse,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS } from './fake_requests';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH } from '../../common/service_accounts';
import type { UiamServiceAccount, UiamServicePublic } from '../uiam';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('UiamServiceAccounts', () => {
  let serviceAccounts: UiamServiceAccounts;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let mockUiam: jest.Mocked<UiamServicePublic>;
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;
  let mockCheckPrivilegesWithRequest: jest.Mocked<CheckPrivilegesWithRequest>;
  let logger: Logger;
  let getCurrentUser: jest.Mock<AuthenticatedUser | null, [KibanaRequest]>;

  const clusterPrivilegesResponse = (authorized: boolean): CheckPrivilegesResponse => ({
    hasAllRequested: authorized,
    username: 'elastic',
    privileges: {
      kibana: [],
      elasticsearch: { cluster: [{ privilege: 'manage_security', authorized }], index: {} },
    },
  });

  const createParams = { name: 'nightshift-relay' };

  const createMockRequest = (authHeader?: string): KibanaRequest =>
    httpServerMock.createKibanaRequest({
      headers: authHeader ? { authorization: authHeader } : {},
    });

  const validResponse: UiamServiceAccount = {
    id: 'service-account-id',
    type: 'project' as const,
    name: 'nightshift-relay',
    organization_id: 'organization-id',
    role_assignments: { limit: { access: ['application'], resource: ['project'] } },
    assumable_by: [
      {
        type: 'project-service-account' as const,
        organization_id: 'organization-id',
        project_type: 'security',
        project_id: 'project-id',
      },
    ],
  };

  beforeEach(() => {
    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);
    logger = loggingSystemMock.create().get('service-accounts');
    mockUiam = uiamServiceMock.create();
    getCurrentUser = jest.fn().mockReturnValue(null);
    mockCheckPrivileges = {
      atSpace: jest.fn(),
      atSpaces: jest.fn(),
      globally: jest.fn().mockResolvedValue(clusterPrivilegesResponse(true)),
    };
    mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);

    serviceAccounts = new UiamServiceAccounts({
      logger,
      requestLifetimeMs: 600_000,
      license: mockLicense,
      uiam: mockUiam,
      checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
      getCurrentUser,
      cloudProjectContext: {
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'security',
      },
    });
  });

  describe('#create', () => {
    it('forwards the caller access token, the fixed `role_assignments` and the derived `assumable_by`', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual({ id: 'service-account-id', name: 'nightshift-relay' });

      expect(mockUiam.createServiceAccount).toHaveBeenCalledTimes(1);
      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
        new HTTPAuthorizationHeader('Bearer', 'essu_my_token'),
        {
          organization_id: 'organization-id',
          name: 'nightshift-relay',
          role_assignments: { limit: { access: ['application'], resource: ['project'] } },
          assumable_by: [
            {
              type: 'project-service-account',
              organization_id: 'organization-id',
              project_type: 'security',
              project_id: 'project-id',
            },
          ],
        },
        undefined
      );
    });

    it('rejects `roles` with a 400, since UIAM cannot downscope yet', async () => {
      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), {
          ...createParams,
          roles: ['viewer'],
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it.each([true, false])(
      'preserves API-key authentication when internal=%s',
      async (internal) => {
        getCurrentUser.mockReturnValue(
          mockAuthenticatedUser({
            authentication_type: 'api_key',
            api_key: { id: 'key-id', name: 'key-name', managed_by: 'cloud', internal },
          })
        );
        mockUiam.createServiceAccount.mockResolvedValue(validResponse);
        await serviceAccounts.create(createMockRequest('ApiKey essu_key'), createParams);
        expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
          new HTTPAuthorizationHeader('ApiKey', 'essu_key'),
          expect.objectContaining({ organization_id: 'organization-id' }),
          internal ? undefined : null
        );
      }
    );

    it('uses client authentication when API-key metadata is unavailable', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);
      await serviceAccounts.create(createMockRequest('ApiKey essu_key'), createParams);
      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
        new HTTPAuthorizationHeader('ApiKey', 'essu_key'),
        expect.anything(),
        undefined
      );
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('rejects with a 401 when the request carries no authorization header', async () => {
      await expect(serviceAccounts.create(createMockRequest(), createParams)).rejects.toMatchObject(
        { output: { statusCode: 401 } }
      );

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('rejects with a 400 when the credential is not a UIAM credential', async () => {
      await expect(
        serviceAccounts.create(createMockRequest('ApiKey abcdef'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('checks the `manage_security` cluster privilege for the caller', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);
      const request = createMockRequest('Bearer essu_my_token');

      await serviceAccounts.create(request, createParams);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
    });

    it('rejects with a 403 when the caller lacks the `manage_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Refused to create a service account: missing `manage_security` cluster privilege'
      );
    });

    // Kibana neither consumes nor reports the rest of UIAM's payload, so drift there is not
    // Kibana's to detect and must not fail a creation that already succeeded.
    it.each<{ name: string; result: UiamServiceAccount }>([
      {
        name: 'an unsupported `assumable_by` principal',
        result: {
          ...validResponse,
          assumable_by: [{ type: 'unsupported-service-account', service_account_id: 'relay' }],
        } as never,
      },
      {
        name: 'a `role_assignments` shape UIAM has changed',
        result: { ...validResponse, role_assignments: 'everything' } as never,
      },
      {
        name: 'a missing `organization_id`',
        result: { ...validResponse, organization_id: undefined } as never,
      },
      {
        name: 'undeclared extra fields',
        result: { ...validResponse, revoked: false, creator: { type: 'user', id: '1' } } as never,
      },
    ])('reports the created account despite $name', async ({ result }) => {
      mockUiam.createServiceAccount.mockResolvedValue(result);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual({ id: 'service-account-id', name: 'nightshift-relay' });
      expect(logger.error).not.toHaveBeenCalled();
    });

    // The id and the name are the only fields that cross the contract boundary, so these are the
    // only ones worth refusing over: handing back an id Kibana just rejected would be worse than
    // failing, even though the account does exist upstream.
    it.each<{ name: string; result: UiamServiceAccount }>([
      { name: 'the name is missing', result: { id: 'service-account-id' } as UiamServiceAccount },
      {
        name: 'the id is missing',
        result: { ...validResponse, id: undefined } as never,
      },
      {
        name: 'the id is too long',
        result: { ...validResponse, id: 'a'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1) },
      },
      {
        name: 'the name is not a string',
        result: { ...validResponse, name: 123 } as never,
      },
    ])('rejects with a 502 when $name', async ({ result }) => {
      mockUiam.createServiceAccount.mockResolvedValue(result);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 502 } });

      // Named in the log, since the account exists upstream and nothing else can find it now,
      // and logged once: this is not also a failure to create the account.
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('UIAM reported the created service account [nightshift-relay]')
      );
      expect(mockUiam.createServiceAccount).toHaveBeenCalledTimes(1);
    });

    it('rejects an empty `roles` before the "not supported" refusal', async () => {
      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), {
          ...createParams,
          roles: [],
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('logs and rethrows upstream failures', async () => {
      mockUiam.createServiceAccount.mockRejectedValue(new Error('upstream exploded'));

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toThrowError('upstream exploded');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create service account [nightshift-relay]')
      );
    });
  });

  describe('#list', () => {
    const listedAccount = {
      ...validResponse,
      creator: {
        type: 'user' as const,
        id: 'user-id',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    };
    const expectedEntry = {
      id: validResponse.id,
      name: validResponse.name,
      roles: [],
      enabled: true,
      hasCredential: true,
      createdBy: { type: 'user' as const, username: 'user-id' },
    };

    it('calls UIAM as Kibana, not as the user, and maps the page onto directory entries', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({ service_accounts: [listedAccount] });

      const result = await serviceAccounts.list(createMockRequest('Bearer essu_my_token'));

      expect(result).toEqual({ service_accounts: [expectedEntry] });
      expect(result).not.toHaveProperty('next_page');
      expect(mockUiam.listServiceAccounts).toHaveBeenCalledTimes(1);
      expect(mockUiam.listServiceAccounts).toHaveBeenCalledWith({});
    });

    it('forwards limit and after, and passes through the next_page cursor', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({
        service_accounts: [listedAccount],
        next_page: 'next',
      });
      const params = { limit: 25, after: 'cursor' };

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'), params)
      ).resolves.toEqual({ service_accounts: [expectedEntry], next_page: 'next' });

      expect(mockUiam.listServiceAccounts).toHaveBeenCalledWith(params);
    });

    it('maps an api-key creator onto an api_key binder', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({
        service_accounts: [
          {
            ...validResponse,
            creator: { type: 'api-key' as const, id: 'api-key-id', description: 'nightshift key' },
          },
        ],
      });

      const result = await serviceAccounts.list(createMockRequest('Bearer essu_my_token'));

      expect(result.service_accounts[0].createdBy).toEqual({
        type: 'api_key',
        apiKeyId: 'api-key-id',
        variant: 'uiam',
      });
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.listServiceAccounts).not.toHaveBeenCalled();
    });

    it('checks the `read_security` cluster privilege for the caller', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({ service_accounts: [] });
      const request = createMockRequest('Bearer essu_my_token');

      await serviceAccounts.list(request);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['read_security'], index: {} },
      });
    });

    it('rejects with a 403 when the caller lacks the `read_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.listServiceAccounts).not.toHaveBeenCalled();
    });

    it('rejects when the upstream response does not match the expected shape', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({ items: [listedAccount] } as never);

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toThrowError('Error occurred during service account listing');
    });

    it('rejects when an account is missing creator', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({
        service_accounts: [validResponse],
      } as never);

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toThrowError('Error occurred during service account listing');
    });

    it("propagates a 403 when UIAM refuses Kibana's assumable_by", async () => {
      mockUiam.listServiceAccounts.mockRejectedValue(Boom.forbidden('not assumable'));

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
    });

    it('propagates a 501 when UIAM has no collection GET', async () => {
      mockUiam.listServiceAccounts.mockRejectedValue(
        Boom.notImplemented('listing is not implemented')
      );

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toMatchObject({ output: { statusCode: 501 } });
    });
  });

  describe('#get', () => {
    const retrievedAccount = {
      ...validResponse,
      creator: {
        type: 'user' as const,
        id: 'user-id',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    };

    it('calls UIAM as Kibana, not as the user, and maps the account onto a directory entry', async () => {
      mockUiam.getServiceAccount.mockResolvedValue(retrievedAccount);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).resolves.toEqual({
        id: validResponse.id,
        name: validResponse.name,
        roles: [],
        enabled: true,
        hasCredential: true,
        createdBy: { type: 'user', username: 'user-id' },
      });

      expect(mockUiam.getServiceAccount).toHaveBeenCalledTimes(1);
      expect(mockUiam.getServiceAccount).toHaveBeenCalledWith('service-account-id');
    });

    it('maps an api-key creator onto an api_key binder', async () => {
      const withApiKeyCreator = {
        ...validResponse,
        creator: {
          type: 'api-key' as const,
          id: 'api-key-id',
          description: 'nightshift key',
        },
      };
      mockUiam.getServiceAccount.mockResolvedValue(withApiKeyCreator);

      const result = await serviceAccounts.get(
        createMockRequest('Bearer essu_my_token'),
        'service-account-id'
      );

      expect(result.createdBy).toEqual({
        type: 'api_key',
        apiKeyId: 'api-key-id',
        variant: 'uiam',
      });
    });

    it('rejects when creator is missing', async () => {
      mockUiam.getServiceAccount.mockResolvedValue(validResponse as never);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).rejects.toThrowError('Error occurred during service account retrieval');
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.getServiceAccount).not.toHaveBeenCalled();
    });

    it('checks the `read_security` cluster privilege for the caller', async () => {
      mockUiam.getServiceAccount.mockResolvedValue(retrievedAccount);
      const request = createMockRequest('Bearer essu_my_token');

      await serviceAccounts.get(request, 'service-account-id');

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['read_security'], index: {} },
      });
    });

    it('rejects with a 403 when the caller lacks the `read_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.getServiceAccount).not.toHaveBeenCalled();
    });

    it('rejects when the upstream response does not match the expected shape', async () => {
      mockUiam.getServiceAccount.mockResolvedValue({ id: 'only-id' } as never);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).rejects.toThrowError('Error occurred during service account retrieval');
    });

    it('propagates a 404 when UIAM has no such account', async () => {
      mockUiam.getServiceAccount.mockRejectedValue(Boom.notFound('Not found'));

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
    });
  });

  describe('fake request lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

      let counter = 0;
      mockUiam.exchangeServiceAccountToken.mockImplementation(async () => ({
        token: `essu_token_${++counter}`,
      }));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('#createFakeRequest', () => {
      it('mints a token and returns a service-account-bound fake request', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
          spaceId: 'marketing',
        });

        expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledWith('service-account-id');
        expect(request.isFakeRequest).toBe(true);
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
        expect(request.spaceId).toBe('marketing');
        expect(request.auth.isAuthenticated).toBe(true);
      });

      it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
        mockLicense.isEnabled.mockReturnValue(false);

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
      });

      // The exchange response is spec/live-verified but still validated so that a shape change
      // fails loudly rather than leaking a partially-undefined credential into a request.
      it('rejects when the exchange response does not match the expected shape', async () => {
        mockUiam.exchangeServiceAccountToken.mockResolvedValue({ credential: 'nope' } as never);

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toThrowError('Error occurred during service account token exchange');
      });

      it('rejects when the exchange response contains an empty token', async () => {
        mockUiam.exchangeServiceAccountToken.mockResolvedValue({ token: '' });

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toThrowError('Error occurred during service account token exchange');
      });

      it.each([408, 429, 500, 502, 503, 504])(
        'classifies HTTP %s as retryable and preserves its cause',
        async (statusCode) => {
          const cause = new Boom.Boom('temporary failure', { statusCode });
          mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
          await expect(
            serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
          ).rejects.toMatchObject({ cause, retryable: true });
        }
      );

      it.each([400, 401, 403, 404, 409, 501])(
        'classifies HTTP %s as terminal',
        async (statusCode) => {
          const cause = new Boom.Boom('rejected', { statusCode });
          mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
          await expect(
            serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
          ).rejects.toMatchObject({ cause, retryable: false });
        }
      );

      it.each(['0xEDF789', '0x3B8626', '0x93B121'])(
        'stops retrying terminal UIAM code %s even with a transient HTTP status',
        async (code) => {
          const cause = new Boom.Boom('rejected', { statusCode: 503 });
          Object.assign(cause.output.payload, { error: { code } });
          mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
          await expect(
            serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
          ).rejects.toMatchObject({ cause, retryable: false });
        }
      );

      it.each([
        'ECONNREFUSED',
        'ECONNRESET',
        'ECONNABORTED',
        'EPIPE',
        'EAI_AGAIN',
        'ETIMEDOUT',
        'ENETUNREACH',
        'EHOSTUNREACH',
        'UND_ERR_CONNECT_TIMEOUT',
        'UND_ERR_HEADERS_TIMEOUT',
        'UND_ERR_BODY_TIMEOUT',
        'UND_ERR_SOCKET',
      ])('retries transport failure %s from fetch', async (code) => {
        const cause = new TypeError('fetch failed', {
          cause: Object.assign(new Error('transport failure'), { code }),
        });
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ cause, retryable: true });
      });

      it.each(['ENOTFOUND', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNCLASSIFIED'])(
        'does not retry transport/configuration failure %s',
        async (code) => {
          const cause = Object.assign(new Error('failure'), { code });
          mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
          await expect(
            serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
          ).rejects.toMatchObject({ cause, retryable: false });
        }
      );

      it.each([
        ['20', 20_000],
        ['Thu, 20 Aug 2026 12:00:30 GMT', 30_000],
        ['Thu, 20 Aug 2026 11:00:00 GMT', 0],
        ['', 0],
        ['invalid', 0],
        ['Infinity', 0],
        ['-1', 0],
        ['9'.repeat(400), 0],
      ])('interprets Retry-After %s as %s milliseconds', async (retryAfter, retryAfterMs) => {
        const cause = Boom.serverUnavailable('temporary failure');
        cause.output.headers['retry-after'] = retryAfter;
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ retryable: true, retryAfterMs });
      });

      it('logs the service account ID without the upstream credential-bearing error message', async () => {
        const cause = new Error('secret-credential');
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);
        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toBeInstanceOf(ServiceAccountTokenExchangeError);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('service-account-id'));
        for (const call of jest.mocked(logger.error).mock.calls) {
          expect(String(call[0])).not.toContain('secret-credential');
        }
      });

      it('logs and rethrows exchange failures', async () => {
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(new Error('upstream exploded'));

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ cause: new Error('upstream exploded'), retryable: false });
      });
    });

    describe('#reauthenticateFakeRequest', () => {
      it('returns null for requests that are not bound to a service account', async () => {
        await expect(
          serviceAccounts.reauthenticateFakeRequest(httpServerMock.createFakeKibanaRequest({}))
        ).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
      });

      it('reuses the current token without minting when it was minted recently', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toEqual({
          authorization: 'Bearer essu_token_1',
        });
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
      });

      it('mints a replacement and updates the request once the reuse window has passed', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toEqual({
          authorization: 'Bearer essu_token_2',
        });
        expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledTimes(1);
        expect(request.headers.authorization).toBe('Bearer essu_token_2');
      });

      it('returns null instead of throwing when minting fails', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(new Error('exchange failed'));

        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        // The stale credential is left in place for the original 401 to propagate.
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
      });

      it('permanently stops a rejected request while another request for the same account remains usable', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        const otherRequest = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);
        mockUiam.exchangeServiceAccountToken.mockRejectedValueOnce(Boom.forbidden('revoked'));
        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        jest.advanceTimersByTime(6_000);
        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledTimes(3);
        expect(await serviceAccounts.reauthenticateFakeRequest(otherRequest)).toEqual({
          authorization: 'Bearer essu_token_3',
        });
      });

      it('recovers from a temporary outage after the backoff', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);
        mockUiam.exchangeServiceAccountToken.mockRejectedValueOnce(Boom.serverUnavailable());
        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        jest.advanceTimersByTime(4_999);
        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledTimes(2);
        jest.advanceTimersByTime(1);
        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toEqual({
          authorization: 'Bearer essu_token_2',
        });
      });

      it('returns null without minting once the request lease has expired', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        jest.advanceTimersByTime(600_000);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
      });
    });

    describe('#releaseFakeRequest', () => {
      it('permanently disables credential replacement and strips the credential', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        serviceAccounts.releaseFakeRequest(request);

        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
        // A request kept past its release must not keep acting on the credential it was minted with.
        expect(request.headers.authorization).toBeUndefined();
      });

      it('is a no-op for requests this backend did not mint', () => {
        expect(() =>
          serviceAccounts.releaseFakeRequest(httpServerMock.createFakeKibanaRequest({}))
        ).not.toThrow();
      });
    });
  });
});
