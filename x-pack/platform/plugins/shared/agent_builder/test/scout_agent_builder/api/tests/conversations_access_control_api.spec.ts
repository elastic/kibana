/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  AgentAccessControlMode,
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  type Conversation,
  type ConversationWithoutRounds,
} from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ChatResponse } from '../../../../common/http_api/chat';
import type {
  GetConversationResponse,
  ListConversationsResponse,
  UpdateConversationAccessControlRequestBody,
  UpdateConversationAccessControlResponse,
  RenameConversationResponse,
} from '../../../../common/http_api/conversations';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { internalApiPath, publicApiPath } from '../../../../common/constants';
import { apiTest } from '../fixtures';
import {
  CHAT_CONVERSATIONS_INDEX,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
} from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

const ACCESS_CONTROL_TEST_PREFIX = 'conversation-access-control-test';

function mockAgent(id: string, accessMode: AgentAccessControlMode) {
  return {
    id,
    name: 'Conversation Access Control Test Agent',
    description: 'Fixture for conversation access-control tests',
    access_control: { access_mode: accessMode },
    configuration: {
      instructions: 'Respond directly to the user',
      tools: [{ tool_ids: ['*'] }],
    },
  };
}

interface KibanaRole {
  elasticsearch?: { cluster?: string[]; indices?: unknown[]; run_as?: string[] };
  kibana?: Array<{
    base?: string[];
    feature?: Record<string, string[]>;
    spaces: string[];
  }>;
}

function agentBuilderRole(accessControlSpaceId: string, privileges: string[]): KibanaRole {
  return {
    elasticsearch: { cluster: ['monitor_inference'], indices: [], run_as: [] },
    kibana: [
      {
        base: [],
        feature: {
          agentBuilder: privileges,
          actions: ['read'],
        },
        spaces: [accessControlSpaceId],
      },
    ],
  };
}

function basicAuthHeader(username: string, password: string): Record<string, string> {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

apiTest.describe(
  'Agent Builder — conversations access-control API',
  { tag: [...tags.stateful.classic] },
  () => {
    const testRunId = randomUUID();
    const accessControlSpaceId = `${ACCESS_CONTROL_TEST_PREFIX}-space-${testRunId}`;
    const accessControlApiBase = spaceUrl(publicApiPath, accessControlSpaceId);
    const accessControlInternalBase = spaceUrl(internalApiPath, accessControlSpaceId);

    // Two native Kibana users with `manageAgents`, distinct usernames.
    // Lets us exercise owner-vs-non-owner scenarios against a real authn identity.
    const alice = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-alice-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-alice-${testRunId}`,
      password: 'alice-password',
    };
    const bob = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-bob-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-bob-${testRunId}`,
      password: 'bob-password',
    };
    // No Agent Builder privileges. Used to assert route-level privilege gates.
    const noAccess = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-no-access-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-no-access-${testRunId}`,
      password: 'no-access-password',
    };

    const allPrincipals = [alice, bob, noAccess];

    let adminCookie: Record<string, string>;
    let llmProxy: LlmProxy;
    let connectorId: string;

    const headersFor = (user: { username: string; password: string }) => ({
      ...COMMON_HEADERS,
      ...basicAuthHeader(user.username, user.password),
      'elastic-api-version': ELASTIC_API_VERSION,
    });
    const adminInternalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminCookie,
      'elastic-api-version': ELASTIC_API_VERSION,
    });
    const adminPublicHeaders = () => ({ 'elastic-api-version': ELASTIC_API_VERSION });

    const createdAgentIds = new Set<string>();
    const trackAgent = (id: string) => {
      createdAgentIds.add(id);
      return id;
    };

    const createConnectorForSpace = async (kbnClient: any, proxy: LlmProxy): Promise<string> => {
      const response = (await kbnClient.request({
        method: 'POST',
        path: `${spaceUrl('', accessControlSpaceId)}/api/actions/connector`,
        headers: { 'kbn-xsrf': 'scout-agent-builder' },
        body: {
          name: 'llm-proxy',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: `http://localhost:${proxy.getPort()}`,
            defaultModel: 'gpt-4',
          },
          secrets: { apiKey: 'myApiKey' },
          connector_type_id: '.gen-ai',
        },
      })) as { data: { id: string } };
      return response.data.id;
    };

    const deleteConnectorForSpace = async (kbnClient: any, id: string): Promise<void> => {
      await kbnClient.request({
        method: 'DELETE',
        path: `${spaceUrl('', accessControlSpaceId)}/api/actions/connector/${encodeURIComponent(
          id
        )}`,
        headers: { 'kbn-xsrf': 'scout-agent-builder' },
        ignoreErrors: [404],
      });
    };

    apiTest.beforeAll(async ({ esClient, samlAuth, kbnClient, log }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminCookie = cookieHeader;
      llmProxy = await createLlmProxy(log);

      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        headers: adminPublicHeaders(),
        body: { id: accessControlSpaceId, name: accessControlSpaceId, disabledFeatures: [] },
      });

      connectorId = await createConnectorForSpace(kbnClient, llmProxy);

      for (const { roleName } of [alice, bob]) {
        await kbnClient.request({
          method: 'PUT',
          path: `/api/security/role/${encodeURIComponent(roleName)}`,
          headers: adminPublicHeaders(),
          body: agentBuilderRole(accessControlSpaceId, ['minimal_read', 'manage_agents']),
        });
      }
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(noAccess.roleName)}`,
        headers: adminPublicHeaders(),
        body: { elasticsearch: { cluster: [], indices: [], run_as: [] } },
      });

      for (const user of allPrincipals) {
        await kbnClient.request({
          method: 'POST',
          path: `/internal/security/users/${encodeURIComponent(user.username)}`,
          headers: adminInternalHeaders(),
          body: {
            username: user.username,
            password: user.password,
            roles: [user.roleName],
            full_name: user.username,
            enabled: true,
          },
        });
      }

      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { term: { space: accessControlSpaceId } },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
      const deleteAgentIfPresent = async (agentId: string) => {
        const response = await apiClient.delete(
          `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
          {
            headers: adminInternalHeaders(),
          }
        );
        expect([200, 404]).toContain(response.statusCode);
      };

      const deleteKibanaResourceIfPresent = async (
        path: string,
        headers: Record<string, string>
      ) => {
        await kbnClient.request({
          method: 'DELETE',
          path,
          headers,
          ignoreErrors: [404],
        });
      };

      // Agents first (their authz still uses ES; admin can delete anything).
      for (const agentId of createdAgentIds) {
        await deleteAgentIfPresent(agentId);
      }
      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { term: { space: accessControlSpaceId } },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      await deleteConnectorForSpace(kbnClient, connectorId);
      llmProxy.close();

      for (const user of allPrincipals) {
        await deleteKibanaResourceIfPresent(
          `/internal/security/users/${encodeURIComponent(user.username)}`,
          adminInternalHeaders()
        );
        await deleteKibanaResourceIfPresent(
          `/api/security/role/${encodeURIComponent(user.roleName)}`,
          adminPublicHeaders()
        );
      }
      await deleteKibanaResourceIfPresent(
        `/api/spaces/space/${encodeURIComponent(accessControlSpaceId)}`,
        adminPublicHeaders()
      );
    });

    // ── helpers ─────────────────────────────────────────────────────────────

    const createAgentAs = async (
      apiClient: any,
      user: { username: string; password: string },
      agent: ReturnType<typeof mockAgent>
    ) => {
      const response = await apiClient.post(`${accessControlApiBase}/agents`, {
        headers: headersFor(user),
        body: agent,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      trackAgent(agent.id);
      return response;
    };

    const setAgentAccessModeAs = async (
      apiClient: any,
      user: { username: string; password: string },
      agentId: string,
      accessMode: AgentAccessControlMode
    ) => {
      const response = await apiClient.put(
        `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: headersFor(user),
          body: { access_control: { access_mode: accessMode } },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
    };

    const createConversationAs = async ({
      apiClient,
      user,
      agentId,
      input,
      title,
      accessMode,
    }: {
      apiClient: any;
      user: { username: string; password: string };
      agentId: string;
      input: string;
      title: string;
      accessMode?: ConversationAccessControlMode;
    }): Promise<ChatResponse> => {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title,
        response: `Response to: ${input}`,
      });
      const response = await apiClient.post(`${accessControlApiBase}/converse`, {
        headers: headersFor(user),
        body: {
          agent_id: agentId,
          input,
          connector_id: connectorId,
          _execution_mode: 'local',
          ...(accessMode ? { access_control: { access_mode: accessMode } } : {}),
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      return response.body as ChatResponse;
    };

    const listConversationIdsAs = async (
      apiClient: any,
      user: { username: string; password: string }
    ): Promise<string[]> => {
      const response = await apiClient.get(`${accessControlApiBase}/conversations`, {
        headers: headersFor(user),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return (response.body as ListConversationsResponse).results.map(
        (conversation: ConversationWithoutRounds) => conversation.id
      );
    };

    const markConversationReadAs = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string,
      read: boolean
    ) => {
      return apiClient.post(
        `${accessControlInternalBase}/conversations/${encodeURIComponent(
          conversationId
        )}/_mark_read`,
        {
          headers: headersFor(user),
          body: { read },
          responseType: 'json',
        }
      );
    };

    const setConversationPinnedAs = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string,
      pinned: boolean
    ) => {
      return apiClient.post(
        `${accessControlInternalBase}/conversations/${encodeURIComponent(
          conversationId
        )}/_set_pinned`,
        {
          headers: headersFor(user),
          body: { pinned },
          responseType: 'json',
        }
      );
    };

    const renameConversationAs = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string,
      title: string
    ) => {
      return apiClient.post(
        `${accessControlInternalBase}/conversations/${encodeURIComponent(conversationId)}/_rename`,
        {
          headers: headersFor(user),
          body: { title },
          responseType: 'json',
        }
      );
    };

    const deleteConversationAs = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string
    ) => {
      return apiClient.delete(
        `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: headersFor(user), responseType: 'json' }
      );
    };

    const getConversationAs = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string
    ) => {
      return apiClient.get(
        `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: headersFor(user), responseType: 'json' }
      );
    };

    const setAccessControlAs = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string,
      body: UpdateConversationAccessControlRequestBody
    ) => {
      return apiClient.put(
        `${accessControlApiBase}/conversations/${encodeURIComponent(
          conversationId
        )}/access_control`,
        { headers: headersFor(user), body, responseType: 'json' }
      );
    };

    /**
     * Entries are keyed on the stable user id, which is only observable through the API as the
     * owner id of a conversation the user created.
     */
    const resolveStableUserId = async (
      apiClient: any,
      user: { username: string; password: string },
      conversationId: string
    ): Promise<string> => {
      const response = await apiClient.get(
        `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: headersFor(user), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const { id } = (response.body as GetConversationResponse).user;
      expect(id).toBeDefined();
      return id as string;
    };

    const deleteAgentAs = async (
      apiClient: any,
      user: { username: string; password: string },
      agentId: string
    ) => {
      return apiClient.delete(`${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`, {
        headers: headersFor(user),
        responseType: 'json',
      });
    };

    // ── public conversation access ──────────────────────────────────────────

    apiTest(
      'public conversations require conversation access and agent use access',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-agent-${testRunId.slice(0, 8)}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlMode.Shared));

        const publicConversation = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Public conversation access test',
          title: 'Public Conversation Access Test',
          accessMode: ConversationAccessControlMode.Public,
        });

        const bobOwnedPublicConversation = await createConversationAs({
          apiClient,
          user: bob,
          agentId,
          input: 'Bob-owned public conversation access test',
          title: 'Bob-Owned Public Conversation Access Test',
          accessMode: ConversationAccessControlMode.Public,
        });

        const ownerMutationConversation = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Owner mutation conversation access test',
          title: 'Owner Mutation Conversation Access Test',
        });

        const privateConversation = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Private conversation access test',
          title: 'Private Conversation Access Test',
        });

        await apiTest.step(
          'Bob can list and get public conversations for usable agents',
          async () => {
            const bobConversationIds = await listConversationIdsAs(apiClient, bob);
            expect(bobConversationIds).toContain(publicConversation.conversation_id);

            const getResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                publicConversation.conversation_id
              )}`,
              { headers: headersFor(bob), responseType: 'json' }
            );
            expect(getResponse).toHaveStatusCode(200);
            expect((getResponse.body as Conversation).id).toBe(publicConversation.conversation_id);
          }
        );

        await apiTest.step(
          'Bob can continue a public conversation for a usable agent',
          async () => {
            await setupAgentDirectAnswer({
              proxy: llmProxy,
              response: 'Response to: Bob public follow-up',
              continueConversation: true,
            });
            const continueResponse = await apiClient.post(`${accessControlApiBase}/converse`, {
              headers: headersFor(bob),
              body: {
                agent_id: agentId,
                conversation_id: publicConversation.conversation_id,
                input: 'Bob public follow-up',
                connector_id: connectorId,
                _execution_mode: 'local',
              },
              responseType: 'json',
            });
            expect(continueResponse).toHaveStatusCode(200);
            await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
          }
        );

        await apiTest.step(
          'conversation rounds are attributed to the Kibana user who sent them',
          async () => {
            expect(publicConversation.author?.username).toBe(alice.username);
            expect(privateConversation.author?.username).toBe(alice.username);

            const getPublicResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                publicConversation.conversation_id
              )}`,
              { headers: headersFor(alice), responseType: 'json' }
            );
            expect(getPublicResponse).toHaveStatusCode(200);
            const conversation = getPublicResponse.body as Conversation;
            expect(conversation.rounds).toHaveLength(2);
            expect(conversation.rounds[0].author?.username).toBe(alice.username);
            expect(conversation.rounds[0].author?.id).toBeDefined();
            expect(conversation.rounds[1].author?.username).toBe(bob.username);
            expect(conversation.rounds[1].author?.id).toBeDefined();

            const getPrivateResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                privateConversation.conversation_id
              )}`,
              { headers: headersFor(alice), responseType: 'json' }
            );
            expect(getPrivateResponse).toHaveStatusCode(200);
            // Private rounds are attributed too, so authorship survives the conversation later
            // being shared.
            const privateRound = (getPrivateResponse.body as Conversation).rounds[0];
            expect(privateRound.author?.username).toBe(alice.username);
            expect(privateRound.author?.id).toBeDefined();
          }
        );

        await apiTest.step(
          'read status is tracked per user, not shared across readers',
          async () => {
            const getReadAs = async (user: { username: string; password: string }) => {
              const response = await getConversationAs(
                apiClient,
                user,
                publicConversation.conversation_id
              );
              expect(response).toHaveStatusCode(200);
              return (response.body as Conversation).read;
            };

            const markReadResponse = await markConversationReadAs(
              apiClient,
              bob,
              publicConversation.conversation_id,
              true
            );
            expect(markReadResponse).toHaveStatusCode(200);
            expect(markReadResponse.body).toMatchObject({
              id: publicConversation.conversation_id,
              read: true,
            });

            expect(await getReadAs(alice)).toBe(false);
            expect(await getReadAs(bob)).toBe(true);

            const markAliceReadResponse = await markConversationReadAs(
              apiClient,
              alice,
              publicConversation.conversation_id,
              true
            );
            expect(markAliceReadResponse).toHaveStatusCode(200);
            expect(await getReadAs(alice)).toBe(true);

            const markBobUnreadResponse = await markConversationReadAs(
              apiClient,
              bob,
              publicConversation.conversation_id,
              false
            );
            expect(markBobUnreadResponse).toHaveStatusCode(200);
            expect(await getReadAs(bob)).toBe(false);
            expect(await getReadAs(alice)).toBe(true);
          }
        );

        await apiTest.step(
          'pinned state is tracked per user, not shared across readers',
          async () => {
            const getPinnedAs = async (user: { username: string; password: string }) => {
              const response = await getConversationAs(
                apiClient,
                user,
                publicConversation.conversation_id
              );
              expect(response).toHaveStatusCode(200);
              return (response.body as Conversation).pinned;
            };

            const pinAsBobResponse = await setConversationPinnedAs(
              apiClient,
              bob,
              publicConversation.conversation_id,
              true
            );
            expect(pinAsBobResponse).toHaveStatusCode(200);
            expect(pinAsBobResponse.body).toMatchObject({
              id: publicConversation.conversation_id,
              pinned: true,
            });

            expect(await getPinnedAs(alice)).toBe(false);
            expect(await getPinnedAs(bob)).toBe(true);

            const pinAsAliceResponse = await setConversationPinnedAs(
              apiClient,
              alice,
              publicConversation.conversation_id,
              true
            );
            expect(pinAsAliceResponse).toHaveStatusCode(200);
            expect(await getPinnedAs(alice)).toBe(true);

            const unpinAsAliceResponse = await setConversationPinnedAs(
              apiClient,
              alice,
              publicConversation.conversation_id,
              false
            );
            expect(unpinAsAliceResponse).toHaveStatusCode(200);
            expect(await getPinnedAs(alice)).toBe(false);
            expect(await getPinnedAs(bob)).toBe(true);
          }
        );

        await apiTest.step(
          'permissions reflect what rename and delete allow, on both GET routes',
          async () => {
            const getAs = async (user: { username: string; password: string }) => {
              const response = await apiClient.get(
                `${accessControlApiBase}/conversations/${encodeURIComponent(
                  publicConversation.conversation_id
                )}`,
                { headers: headersFor(user), responseType: 'json' }
              );
              expect(response).toHaveStatusCode(200);
              return response.body as GetConversationResponse;
            };

            expect((await getAs(alice)).permissions).toStrictEqual({
              rename: true,
              delete: true,
              update_access_control: true,
            });
            expect((await getAs(bob)).permissions).toStrictEqual({
              rename: false,
              delete: false,
              update_access_control: false,
            });

            const listedForBob = await apiClient.get(`${accessControlApiBase}/conversations`, {
              headers: headersFor(bob),
              responseType: 'json',
            });
            expect(listedForBob).toHaveStatusCode(200);
            const listedPublicConversation = (
              listedForBob.body as ListConversationsResponse
            ).results.find(({ id }) => id === publicConversation.conversation_id);
            expect(listedPublicConversation?.permissions).toStrictEqual({
              rename: false,
              delete: false,
              update_access_control: false,
            });
          }
        );

        await apiTest.step('Bob cannot rename or delete Alice public conversation', async () => {
          const renameResponse = await renameConversationAs(
            apiClient,
            bob,
            publicConversation.conversation_id,
            'Bob renamed public conversation'
          );
          expect(renameResponse).toHaveStatusCode(404);

          const deleteResponse = await apiClient.delete(
            `${accessControlApiBase}/conversations/${encodeURIComponent(
              publicConversation.conversation_id
            )}`,
            { headers: headersFor(bob), responseType: 'json' }
          );
          expect(deleteResponse).toHaveStatusCode(404);

          const getResponse = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(
              publicConversation.conversation_id
            )}`,
            { headers: headersFor(alice), responseType: 'json' }
          );
          expect(getResponse).toHaveStatusCode(200);
          expect((getResponse.body as Conversation).title).toBe('Public Conversation Access Test');
        });

        await apiTest.step('Alice can rename and delete her own conversation', async () => {
          const renamedTitle = 'Alice Renamed Owner Conversation';
          const renameResponse = await renameConversationAs(
            apiClient,
            alice,
            ownerMutationConversation.conversation_id,
            renamedTitle
          );
          expect(renameResponse).toHaveStatusCode(200);
          expect(renameResponse.body).toMatchObject({
            id: ownerMutationConversation.conversation_id,
            title: renamedTitle,
          });

          const getRenamedResponse = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(
              ownerMutationConversation.conversation_id
            )}`,
            { headers: headersFor(alice), responseType: 'json' }
          );
          expect(getRenamedResponse).toHaveStatusCode(200);
          expect((getRenamedResponse.body as Conversation).title).toBe(renamedTitle);

          const deleteResponse = await deleteConversationAs(
            apiClient,
            alice,
            ownerMutationConversation.conversation_id
          );
          expect(deleteResponse).toHaveStatusCode(200);
          expect(deleteResponse.body).toMatchObject({ success: true });

          const getDeletedResponse = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(
              ownerMutationConversation.conversation_id
            )}`,
            { headers: headersFor(alice), responseType: 'json' }
          );
          expect(getDeletedResponse).toHaveStatusCode(404);
        });

        await apiTest.step('Bob cannot list or get Alice private conversations', async () => {
          const bobConversationIds = await listConversationIdsAs(apiClient, bob);
          expect(bobConversationIds).not.toContain(privateConversation.conversation_id);

          const getPrivateResponse = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(
              privateConversation.conversation_id
            )}`,
            { headers: headersFor(bob), responseType: 'json' }
          );
          expect(getPrivateResponse).toHaveStatusCode(404);
        });

        await apiTest.step(
          'Bob cannot continue or mark read Alice private conversations',
          async () => {
            const continuePrivateResponse = await apiClient.post(
              `${accessControlApiBase}/converse`,
              {
                headers: headersFor(bob),
                body: {
                  agent_id: agentId,
                  conversation_id: privateConversation.conversation_id,
                  input: 'Bob private follow-up',
                  connector_id: connectorId,
                  _execution_mode: 'local',
                },
                responseType: 'json',
              }
            );
            expect(continuePrivateResponse).toHaveStatusCode(404);

            const markReadResponse = await markConversationReadAs(
              apiClient,
              bob,
              privateConversation.conversation_id,
              true
            );
            expect(markReadResponse).toHaveStatusCode(404);
          }
        );

        await apiTest.step(
          'Bob loses access when the underlying agent becomes private',
          async () => {
            await setAgentAccessModeAs(apiClient, alice, agentId, AgentAccessControlMode.Private);

            const bobConversationIds = await listConversationIdsAs(apiClient, bob);
            expect(bobConversationIds).not.toContain(publicConversation.conversation_id);
            expect(bobConversationIds).not.toContain(bobOwnedPublicConversation.conversation_id);

            const getPublicResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                publicConversation.conversation_id
              )}`,
              { headers: headersFor(bob), responseType: 'json' }
            );
            expect(getPublicResponse).toHaveStatusCode(404);

            const getOwnPublicResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                bobOwnedPublicConversation.conversation_id
              )}`,
              { headers: headersFor(bob), responseType: 'json' }
            );
            expect(getOwnPublicResponse).toHaveStatusCode(404);

            const continueOwnPublicResponse = await apiClient.post(
              `${accessControlApiBase}/converse`,
              {
                headers: headersFor(bob),
                body: {
                  agent_id: agentId,
                  conversation_id: bobOwnedPublicConversation.conversation_id,
                  input: 'Bob-owned public follow-up after revocation',
                  connector_id: connectorId,
                  _execution_mode: 'local',
                },
                responseType: 'json',
              }
            );
            expect(continueOwnPublicResponse).toHaveStatusCode(404);

            const markReadResponse = await markConversationReadAs(
              apiClient,
              bob,
              publicConversation.conversation_id,
              false
            );
            expect(markReadResponse).toHaveStatusCode(404);

            const markOwnReadResponse = await markConversationReadAs(
              apiClient,
              bob,
              bobOwnedPublicConversation.conversation_id,
              false
            );
            expect(markOwnReadResponse).toHaveStatusCode(404);
          }
        );

        await apiTest.step(
          'Bob regains access when the underlying agent becomes shared',
          async () => {
            await setAgentAccessModeAs(apiClient, alice, agentId, AgentAccessControlMode.Shared);

            const bobConversationIds = await listConversationIdsAs(apiClient, bob);
            expect(bobConversationIds).toContain(publicConversation.conversation_id);
            expect(bobConversationIds).toContain(bobOwnedPublicConversation.conversation_id);

            const getPublicResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                publicConversation.conversation_id
              )}`,
              { headers: headersFor(bob), responseType: 'json' }
            );
            expect(getPublicResponse).toHaveStatusCode(200);
            expect((getPublicResponse.body as Conversation).id).toBe(
              publicConversation.conversation_id
            );
          }
        );

        await apiTest.step(
          'Deleted agents make referenced conversations inaccessible',
          async () => {
            const deleteAgentResponse = await deleteAgentAs(apiClient, alice, agentId);
            expect(deleteAgentResponse).toHaveStatusCode(200);

            const getOrphanedResponse = await apiClient.get(
              `${accessControlApiBase}/conversations/${encodeURIComponent(
                publicConversation.conversation_id
              )}`,
              { headers: headersFor(alice), responseType: 'json' }
            );
            expect(getOrphanedResponse).toHaveStatusCode(404);
          }
        );
      }
    );

    // ── auto-create IDOR ──────────────────────────────────────────────────────

    apiTest(
      'auto-create cannot overwrite or take over another user conversation',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-autocreate-agent-${testRunId.slice(0, 8)}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlMode.Shared));

        const aliceConversation = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'alice data',
          title: 'Alice private conversation',
        });
        const conversationId = aliceConversation.conversation_id;

        // converse auto-creates a conversation with the caller-supplied id, so Bob replaying
        // Alice's id previously overwrote and took over her conversation. It must now be
        // rejected before any create, with no LLM round (so no interceptor is set up).
        const attempt = await apiClient.post(`${accessControlApiBase}/converse`, {
          headers: headersFor(bob),
          body: {
            agent_id: agentId,
            input: 'bob data',
            connector_id: connectorId,
            _execution_mode: 'local',
            conversation_id: conversationId,
          },
          responseType: 'json',
        });
        expect(attempt).toHaveStatusCode(404);

        const aliceView = await apiClient.get(
          `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: headersFor(alice), responseType: 'json' }
        );
        expect(aliceView).toHaveStatusCode(200);
        const conversation = aliceView.body as Conversation;
        expect(conversation.user.username).toBe(alice.username);
        expect(conversation.rounds).toHaveLength(1);

        const bobView = await apiClient.get(
          `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: headersFor(bob), responseType: 'json' }
        );
        expect(bobView).toHaveStatusCode(404);
      }
    );

    // ── access-control conversation GET/PUT routes ──────────────────────────

    apiTest(
      'the owner shares a private conversation through the access-control routes',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-sharing-agent-${testRunId.slice(0, 8)}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlMode.Shared));

        const aliceConversation = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Sharing routes test',
          title: 'Sharing Routes Test',
        });
        const conversationId = aliceConversation.conversation_id;

        // Bob's stable id is only observable through a conversation he owns.
        const bobConversation = await createConversationAs({
          apiClient,
          user: bob,
          agentId,
          input: 'Bob stable id probe',
          title: 'Bob Stable Id Probe',
        });
        const aliceId = await resolveStableUserId(apiClient, alice, conversationId);
        const bobId = await resolveStableUserId(apiClient, bob, bobConversation.conversation_id);

        let sharedAt = '';

        await apiTest.step('Bob cannot see the conversation before it is shared', async () => {
          expect(await getConversationAs(apiClient, bob, conversationId)).toHaveStatusCode(404);
          expect(await listConversationIdsAs(apiClient, bob)).not.toContain(conversationId);
        });

        await apiTest.step('the owner adds Bob as a member', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Private,
            entries: [{ type: 'user', id: bobId, role: ConversationAccessControlRole.Member }],
          });
          expect(response).toHaveStatusCode(200);

          const accessControl = response.body as UpdateConversationAccessControlResponse;
          expect(accessControl.access_mode).toBe(ConversationAccessControlMode.Private);
          expect(accessControl.entries).toHaveLength(1);
          expect(accessControl.entries[0]).toMatchObject({
            type: 'user',
            id: bobId,
            role: ConversationAccessControlRole.Member,
          });
          expect(typeof accessControl.entries[0].added_at).toBe('string');

          sharedAt = accessControl.entries[0].added_at;
        });

        await apiTest.step('Bob can read, list, and continue the shared conversation', async () => {
          const getResponse = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
            { headers: headersFor(bob), responseType: 'json' }
          );
          expect(getResponse).toHaveStatusCode(200);
          expect(await listConversationIdsAs(apiClient, bob)).toContain(conversationId);

          await setupAgentDirectAnswer({
            proxy: llmProxy,
            response: 'Response to: Bob shared follow-up',
            continueConversation: true,
          });
          const continueResponse = await apiClient.post(`${accessControlApiBase}/converse`, {
            headers: headersFor(bob),
            body: {
              agent_id: agentId,
              conversation_id: conversationId,
              input: 'Bob shared follow-up',
              connector_id: connectorId,
              _execution_mode: 'local',
            },
            responseType: 'json',
          });
          expect(continueResponse).toHaveStatusCode(200);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        });

        await apiTest.step('Bob sees the full member list but cannot manage it', async () => {
          const response = await getConversationAs(apiClient, bob, conversationId);
          expect(response).toHaveStatusCode(200);

          const body = response.body as GetConversationResponse;
          const { access_control: accessControl } = body;
          if (!accessControl) {
            throw new Error('Expected the conversation response to include access control');
          }
          expect(accessControl.entries).toHaveLength(1);
          expect(accessControl.entries[0].id).toBe(bobId);
          expect(body.permissions).toStrictEqual({
            rename: false,
            delete: false,
            update_access_control: false,
          });

          expect(
            await setAccessControlAs(apiClient, bob, conversationId, {
              access_mode: ConversationAccessControlMode.Private,
              entries: [],
            })
          ).toHaveStatusCode(404);
        });

        await apiTest.step('the owner entry is dropped and added_at survives', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Private,
            entries: [
              { type: 'user', id: aliceId, role: ConversationAccessControlRole.Member },
              { type: 'user', id: bobId, role: ConversationAccessControlRole.Member },
            ],
          });
          expect(response).toHaveStatusCode(200);

          const accessControl = response.body as UpdateConversationAccessControlResponse;
          expect(accessControl.entries).toHaveLength(1);
          expect(accessControl.entries[0].id).toBe(bobId);
          expect(accessControl.entries[0].added_at).toBe(sharedAt);
        });

        await apiTest.step('duplicate entries are rejected', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Private,
            entries: [
              { type: 'user', id: bobId, role: ConversationAccessControlRole.Member },
              { type: 'user', id: bobId, role: ConversationAccessControlRole.Member },
            ],
          });
          expect(response).toHaveStatusCode(400);
        });

        await apiTest.step('more entries than the maximum are rejected', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Private,
            entries: Array.from(
              { length: CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES + 1 },
              (_, index) => ({
                type: 'user' as const,
                id: `member-${index}`,
                role: ConversationAccessControlRole.Member,
              })
            ),
          });
          expect(response).toHaveStatusCode(400);
        });

        await apiTest.step('the owner unshares the conversation', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Private,
            entries: [],
          });
          expect(response).toHaveStatusCode(200);
          expect((response.body as UpdateConversationAccessControlResponse).entries).toHaveLength(
            0
          );

          expect(await getConversationAs(apiClient, bob, conversationId)).toHaveStatusCode(404);
          expect(await listConversationIdsAs(apiClient, bob)).not.toContain(conversationId);
        });

        await apiTest.step('entries are rejected alongside a public access mode', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Public,
            entries: [{ type: 'user', id: bobId, role: ConversationAccessControlRole.Member }],
          });
          expect(response).toHaveStatusCode(400);
        });

        await apiTest.step('the owner can publish the conversation instead', async () => {
          const response = await setAccessControlAs(apiClient, alice, conversationId, {
            access_mode: ConversationAccessControlMode.Public,
            entries: [],
          });
          expect(response).toHaveStatusCode(200);

          const bobView = await getConversationAs(apiClient, bob, conversationId);
          expect(bobView).toHaveStatusCode(200);
          expect((bobView.body as GetConversationResponse).access_control).toStrictEqual({
            access_mode: ConversationAccessControlMode.Public,
            entries: [],
          });
        });
      }
    );

    // ── cluster admin management ────────────────────────────────────────────

    apiTest(
      'cluster admin can rename and delete a public conversation they do not own',
      async ({ apiClient, asAdmin }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-admin-public-agent-${testRunId.slice(0, 8)}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlMode.Shared));

        const toRename = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Admin rename target',
          title: 'Admin Rename Target',
          accessMode: ConversationAccessControlMode.Public,
        });
        const toDelete = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Admin delete target',
          title: 'Admin Delete Target',
          accessMode: ConversationAccessControlMode.Public,
        });

        await apiTest.step('admin renames the conversation', async () => {
          const renamed = await asAdmin.post(
            `${accessControlInternalBase}/conversations/${encodeURIComponent(
              toRename.conversation_id
            )}/_rename`,
            {
              headers: { 'elastic-api-version': ELASTIC_API_VERSION },
              body: { title: 'Renamed by admin' },
              responseType: 'json',
            }
          );
          expect(renamed).toHaveStatusCode(200);
          expect((renamed.body as RenameConversationResponse).title).toBe('Renamed by admin');
        });

        await apiTest.step('admin deletes the conversation', async () => {
          const deleted = await asAdmin.delete(
            `${accessControlApiBase}/conversations/${encodeURIComponent(toDelete.conversation_id)}`,
            {
              headers: { 'elastic-api-version': ELASTIC_API_VERSION },
              responseType: 'json',
            }
          );
          expect(deleted).toHaveStatusCode(200);

          const ownerView = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(toDelete.conversation_id)}`,
            { headers: headersFor(alice), responseType: 'json' }
          );
          expect(ownerView).toHaveStatusCode(404);
        });
      }
    );

    apiTest(
      'cluster admin cannot rename or delete a private conversation they do not own',
      async ({ apiClient, asAdmin }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-admin-private-agent-${testRunId.slice(
          0,
          8
        )}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlMode.Shared));

        const privateConversation = await createConversationAs({
          apiClient,
          user: alice,
          agentId,
          input: 'Admin private target',
          title: 'Admin Private Target',
        });
        const conversationId = privateConversation.conversation_id;

        await apiTest.step('rename is masked as not found', async () => {
          const renamed = await asAdmin.post(
            `${accessControlInternalBase}/conversations/${encodeURIComponent(
              conversationId
            )}/_rename`,
            {
              headers: { 'elastic-api-version': ELASTIC_API_VERSION },
              body: { title: 'Renamed by admin' },
              responseType: 'json',
            }
          );
          expect(renamed).toHaveStatusCode(404);
        });

        await apiTest.step('delete is masked as not found', async () => {
          const deleted = await asAdmin.delete(
            `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
            {
              headers: { 'elastic-api-version': ELASTIC_API_VERSION },
              responseType: 'json',
            }
          );
          expect(deleted).toHaveStatusCode(404);
        });

        await apiTest.step('the conversation is untouched for its owner', async () => {
          const ownerView = await apiClient.get(
            `${accessControlApiBase}/conversations/${encodeURIComponent(conversationId)}`,
            { headers: headersFor(alice), responseType: 'json' }
          );
          expect(ownerView).toHaveStatusCode(200);
          expect((ownerView.body as Conversation).title).not.toBe('Renamed by admin');
        });
      }
    );

    // ── route-level privileges ──────────────────────────────────────────────

    apiTest(
      'route-level privilege remains distinct from resource access',
      async ({ apiClient }) => {
        const response = await apiClient.get(`${accessControlApiBase}/conversations`, {
          headers: headersFor(noAccess),
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
