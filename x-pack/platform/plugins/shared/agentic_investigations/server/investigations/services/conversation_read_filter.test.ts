/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { buildConversationReadFilter, resolveConversationReader } from './conversation_read_filter';

const createSecurity = ({
  user,
  principal,
}: {
  user?: Record<string, unknown> | null;
  principal?: { type: string; serviceAccountId?: string } | null;
}) =>
  ({
    authc: {
      getCurrentUser: jest.fn().mockReturnValue(user ?? null),
      getPrincipal: jest.fn().mockReturnValue(principal ?? null),
    },
  } as unknown as SecurityServiceStart);

const createEsClient = ({
  username = 'es-user',
  apiKeyProfileUid,
}: { username?: string; apiKeyProfileUid?: string } = {}) =>
  ({
    security: {
      authenticate: jest.fn().mockResolvedValue({ username }),
      getApiKey: jest.fn().mockResolvedValue({
        api_keys: apiKeyProfileUid ? [{ profile_uid: apiKeyProfileUid }] : [],
      }),
    },
  } as unknown as ElasticsearchClient);

describe('resolveConversationReader', () => {
  const request = httpServerMock.createKibanaRequest();

  it('uses the profile uid when the user has one', async () => {
    await expect(
      resolveConversationReader({
        request,
        security: createSecurity({ user: { username: 'jane', profile_uid: 'profile-1' } }),
        esClient: createEsClient(),
      })
    ).resolves.toEqual({ id: 'profile-1', username: 'jane' });
  });

  it('builds the realm id Agent Builder stores for a user without a profile', async () => {
    await expect(
      resolveConversationReader({
        request,
        security: createSecurity({
          user: { username: 'jane', authentication_realm: { type: 'native', name: 'native1' } },
        }),
        esClient: createEsClient(),
      })
    ).resolves.toEqual({ id: 'realm:["native","native1","jane"]', username: 'jane' });
  });

  it("looks up an API key creator's profile", async () => {
    const apiKeyRequest = httpServerMock.createKibanaRequest({
      headers: { authorization: `ApiKey ${Buffer.from('key-id:secret').toString('base64')}` },
    });
    const esClient = createEsClient({ apiKeyProfileUid: 'profile-2' });

    await expect(
      resolveConversationReader({
        request: apiKeyRequest,
        security: createSecurity({ user: { username: 'jane', authentication_type: 'api_key' } }),
        esClient,
      })
    ).resolves.toEqual({ id: 'profile-2', username: 'jane' });
    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'key-id',
    });
  });

  it('gives a service account its synthetic id', async () => {
    await expect(
      resolveConversationReader({
        request,
        security: createSecurity({
          user: null,
          principal: { type: 'service_account', serviceAccountId: 'elastic/kibana' },
        }),
        esClient: createEsClient({ username: 'elastic/kibana' }),
      })
    ).resolves.toEqual({ id: 'service_account:elastic/kibana', username: 'elastic/kibana' });
  });
});

describe('buildConversationReadFilter', () => {
  it('scopes to the space, the readable conversations on accessible agents, and top-level ones', () => {
    expect(
      buildConversationReadFilter({
        spaceId: 'team-a',
        reader: { id: 'profile-1', username: 'jane' },
        agentIds: ['agent-1'],
      })
    ).toEqual([
      { bool: { should: [{ term: { space: 'team-a' } }], minimum_should_match: 1 } },
      {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { 'access_control.access_mode': 'public' } },
                  {
                    bool: {
                      should: [
                        { term: { user_id: 'profile-1' } },
                        {
                          bool: {
                            must_not: { exists: { field: 'user_id' } },
                            filter: { term: { user_name: 'jane' } },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    nested: {
                      path: 'access_control.entries',
                      ignore_unmapped: true,
                      query: {
                        bool: {
                          filter: [
                            { term: { 'access_control.entries.type': 'user' } },
                            { term: { 'access_control.entries.id': 'profile-1' } },
                          ],
                        },
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            { terms: { agent_id: ['agent-1'] } },
          ],
        },
      },
      { bool: { must_not: [{ exists: { field: 'parent_conversation' } }] } },
    ]);
  });

  it('also matches conversations stored without a space in the default space', () => {
    const [spaceFilter] = buildConversationReadFilter({
      spaceId: 'default',
      reader: { id: 'profile-1', username: 'jane' },
      agentIds: ['agent-1'],
    });
    expect(spaceFilter).toEqual({
      bool: {
        should: [
          { term: { space: 'default' } },
          { bool: { must_not: { exists: { field: 'space' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('matches only public and username-owned conversations for a reader without an id', () => {
    const [, readAccess] = buildConversationReadFilter({
      spaceId: 'default',
      reader: { username: 'jane' },
      agentIds: ['agent-1'],
    });
    expect(JSON.stringify(readAccess)).not.toContain('access_control.entries');
    expect(JSON.stringify(readAccess)).not.toContain('"user_id":');
  });
});
