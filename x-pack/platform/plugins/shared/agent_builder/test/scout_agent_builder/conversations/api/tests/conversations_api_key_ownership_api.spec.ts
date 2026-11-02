/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { SecurityRoleDescriptor } from '@elastic/elasticsearch/lib/api/types';
import type { CreateConversationResponse } from '../../../../../common/http_api/conversations';
import {
  apiTest,
  API_AGENT_BUILDER,
  CHAT_CONVERSATIONS_INDEX,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
} from '../fixtures';

const TEST_PREFIX = 'conversation-api-key-ownership-test';

interface TestUser {
  username: string;
  password: string;
}

interface Credentials {
  headers: Record<string, string>;
}

const readSessionCookie = (setCookie: string | string[] | undefined): string => {
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  const sid = cookies.map((cookie) => cookie.split(';')[0]).find((pair) => pair.startsWith('sid='));

  expect(sid).toBeDefined();
  return sid as string;
};

apiTest.describe(
  'Agent Builder — conversation ownership with API keys',
  { tag: [...tags.stateful.classic] },
  () => {
    const testRunId = randomUUID();
    const roleName = `${TEST_PREFIX}-role-${testRunId}`;
    const owner: TestUser = {
      username: `${TEST_PREFIX}-owner-${testRunId}`,
      password: 'owner-password',
    };
    const otherUser: TestUser = {
      username: `${TEST_PREFIX}-other-${testRunId}`,
      password: 'other-password',
    };
    const apiKeyIds: string[] = [];

    const sessionCredentials = (sid: string): Credentials => ({
      headers: { ...COMMON_HEADERS, Cookie: sid, 'elastic-api-version': ELASTIC_API_VERSION },
    });

    const apiKeyCredentials = (encoded: string): Credentials => ({
      headers: {
        ...COMMON_HEADERS,
        Authorization: `ApiKey ${encoded}`,
        'elastic-api-version': ELASTIC_API_VERSION,
      },
    });

    apiTest.beforeAll(async ({ esClient, kbnClient }) => {
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(roleName)}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        body: {
          elasticsearch: { cluster: ['manage_own_api_key'], indices: [], run_as: [] },
          kibana: [{ base: [], feature: { agentBuilder: ['minimal_read'] }, spaces: ['*'] }],
        },
      });

      for (const { username, password } of [owner, otherUser]) {
        await esClient.security.putUser({ username, password, roles: [roleName] });
      }
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      if (apiKeyIds.length > 0) {
        await esClient.security.invalidateApiKey({ ids: apiKeyIds });
      }

      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { terms: { user_name: [owner.username, otherUser.username] } },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });

      for (const { username } of [owner, otherUser]) {
        await esClient.security.deleteUser({ username }, { ignore: [404] });
      }

      await kbnClient.request({
        method: 'DELETE',
        path: `/api/security/role/${encodeURIComponent(roleName)}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        ignoreErrors: [404],
      });
    });

    apiTest(
      'an API key owns the same conversations as its owner once the owner has logged in',
      async ({ apiClient, esClient }) => {
        const login = async ({ username, password }: TestUser): Promise<string> => {
          const response = await apiClient.post('/internal/security/login', {
            headers: COMMON_HEADERS,
            body: {
              providerType: 'basic',
              providerName: 'cloud-basic',
              currentURL: '/',
              params: { username, password },
            },
          });
          expect(response).toHaveStatusCode(200);

          return readSessionCookie(response.headers['set-cookie']);
        };

        const getProfileUid = async (sid: string): Promise<string | undefined> => {
          const response = await apiClient.get('/internal/security/me', {
            ...sessionCredentials(sid),
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);

          return (response.body as { profile_uid?: string }).profile_uid;
        };

        const getApiKeyProfileUid = async (id: string): Promise<string | undefined> => {
          const { api_keys: apiKeys } = await esClient.security.getApiKey({
            id,
            with_profile_uid: true,
          });

          return apiKeys[0]?.profile_uid;
        };

        const createApiKeyFromSession = async (
          sid: string,
          name: string,
          roleDescriptors: Record<string, SecurityRoleDescriptor> = {}
        ): Promise<string> => {
          const response = await apiClient.post('/internal/security/api_key', {
            ...sessionCredentials(sid),
            body: { name, role_descriptors: roleDescriptors },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);

          const { id, encoded } = response.body as { id: string; encoded: string };
          apiKeyIds.push(id);
          return encoded;
        };

        const createConversation = async ({
          headers,
        }: Credentials): Promise<CreateConversationResponse> => {
          const response = await apiClient.post(`${API_AGENT_BUILDER}/conversations`, {
            headers,
            body: {},
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);

          return response.body as CreateConversationResponse;
        };

        const getConversationStatus = async (
          { headers }: Credentials,
          conversationId: string
        ): Promise<number> => {
          const response = await apiClient.get(
            `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
            { headers, responseType: 'json' }
          );

          return response.statusCode;
        };

        let keyBeforeLogin: Credentials;
        let keyBeforeLoginId: string;
        let ownerSid: string;
        let ownerSession: Credentials;
        let ownerProfileUid: string | undefined;
        let keyAfterLogin: Credentials;

        await apiTest.step('a key created before the first login has no profile', async () => {
          const { id, encoded } = await esClient.security.grantApiKey({
            grant_type: 'password',
            username: owner.username,
            password: owner.password,
            api_key: { name: `${TEST_PREFIX}-before-login` },
          });
          apiKeyIds.push(id);

          keyBeforeLoginId = id;
          keyBeforeLogin = apiKeyCredentials(encoded as string);

          expect(await getApiKeyProfileUid(id)).toBeUndefined();
        });

        await apiTest.step('logging in once activates the owner profile', async () => {
          ownerSid = await login(owner);

          ownerSession = sessionCredentials(ownerSid);
          ownerProfileUid = await getProfileUid(ownerSid);
          expect(ownerProfileUid).toBeDefined();

          keyAfterLogin = apiKeyCredentials(
            await createApiKeyFromSession(ownerSid, `${TEST_PREFIX}-after-login`)
          );
        });

        await apiTest.step('keys resolve to the owner profile, including older keys', async () => {
          expect(await getApiKeyProfileUid(keyBeforeLoginId)).toBe(ownerProfileUid);
        });

        await apiTest.step(
          'API keys own private conversations created in the session',
          async () => {
            const conversation = await createConversation(ownerSession);
            expect(conversation.user.id).toBe(ownerProfileUid);

            expect(await getConversationStatus(keyAfterLogin, conversation.id)).toBe(200);
            expect(await getConversationStatus(keyBeforeLogin, conversation.id)).toBe(200);
          }
        );

        await apiTest.step(
          'the session owns private conversations created with an API key',
          async () => {
            const conversation = await createConversation(keyAfterLogin);
            expect(conversation.user.id).toBe(ownerProfileUid);

            expect(await getConversationStatus(ownerSession, conversation.id)).toBe(200);
          }
        );

        await apiTest.step(
          'a key restricted to Kibana privileges, without manage_own_api_key, still owns the conversation',
          async () => {
            const { [roleName]: role } = await esClient.security.getRole({ name: roleName });
            const encoded = await createApiKeyFromSession(ownerSid, `${TEST_PREFIX}-restricted`, {
              kibana_only: { cluster: [], applications: role.applications },
            });
            const restrictedKey = apiKeyCredentials(encoded);

            const [keyId] = Buffer.from(encoded, 'base64').toString().split(':');
            const asKey = { headers: { authorization: `ApiKey ${encoded}` } };

            await expect(
              esClient.security.createApiKey({ name: `${TEST_PREFIX}-nested` }, asKey)
            ).rejects.toThrow('security_exception');

            const { api_keys: ownKey } = await esClient.security.getApiKey(
              { id: keyId, with_profile_uid: true },
              asKey
            );
            expect(ownKey[0]?.profile_uid).toBe(ownerProfileUid);

            const ownedByKey = await createConversation(restrictedKey);
            expect(ownedByKey.user.id).toBe(ownerProfileUid);

            const ownedBySession = await createConversation(ownerSession);
            expect(await getConversationStatus(restrictedKey, ownedBySession.id)).toBe(200);
          }
        );

        await apiTest.step('another user API key does not own the conversation', async () => {
          const conversation = await createConversation(ownerSession);

          const otherSid = await login(otherUser);
          const otherKey = apiKeyCredentials(
            await createApiKeyFromSession(otherSid, `${TEST_PREFIX}-other-user`)
          );

          expect(await getConversationStatus(otherKey, conversation.id)).toBe(404);
        });
      }
    );
  }
);
