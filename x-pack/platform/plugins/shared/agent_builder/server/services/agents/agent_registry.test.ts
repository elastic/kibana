/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  savedObjectsServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import type { AgentTypeDefinition, AgentTypeRegistry } from '@kbn/agent-builder-server/agents';
import type { AgentListOptions } from '../../../common/agents';
import { createMockedInternalAgent } from '../../test_utils/agents';
import { createAgentRegistry, type InternalAgentDefinition } from './agent_registry';
import type { ReadonlyAgentProvider, WritableAgentProvider } from './agent_source';

const createTypeRegistryStub = (types: AgentTypeDefinition[] = []): AgentTypeRegistry => {
  const typeMap = new Map<string, AgentTypeDefinition>(types.map((type) => [type.id, type]));
  if (!typeMap.has(chatAgentTypeId)) {
    typeMap.set(chatAgentTypeId, { id: chatAgentTypeId, baseConfiguration: {} });
  }
  return {
    register: jest.fn(),
    has: (typeId) => typeMap.has(typeId),
    get: (typeId) => typeMap.get(typeId),
    list: () => [...typeMap.values()],
  };
};

const createBuiltinProviderMock = (
  agents: InternalAgentDefinition[] = []
): ReadonlyAgentProvider => ({
  id: 'builtin',
  readonly: true,
  has: (agentId) => agents.some((agent) => agent.id === agentId),
  get: (agentId) => agents.find((agent) => agent.id === agentId)!,
  list: () => agents,
});

const createPersistedProviderMock = (
  agents: InternalAgentDefinition[] = []
): jest.Mocked<WritableAgentProvider> => ({
  id: 'persisted',
  readonly: false,
  has: jest.fn(async (agentId: string) => agents.some((agent) => agent.id === agentId)),
  get: jest.fn(async (agentId: string) => agents.find((agent) => agent.id === agentId)!),
  list: jest.fn(async (_opts: AgentListOptions) => agents),
  getIds: jest.fn(async (_opts: AgentListOptions) => agents.map((agent) => agent.id)),
  create: jest.fn(async (createRequest) =>
    createMockedInternalAgent({ id: createRequest.id, type: createRequest.type ?? chatAgentTypeId })
  ),
  update: jest.fn(async (agentId, update) => {
    const current = agents.find((agent) => agent.id === agentId)!;
    return {
      ...current,
      configuration: { ...current.configuration, ...update.configuration },
    };
  }),
  setServiceAccount: jest.fn(
    async (agentId: string, _serviceAccountId: string | null) =>
      agents.find((agent) => agent.id === agentId)!
  ),
  delete: jest.fn(),
  getAccessControl: jest.fn(),
  updateAccessControl: jest.fn(),
});

const createRegistry = ({
  types,
  builtinAgents = [],
  persistedAgents = [],
  persistedProvider,
}: {
  types?: AgentTypeDefinition[];
  builtinAgents?: InternalAgentDefinition[];
  persistedAgents?: InternalAgentDefinition[];
  persistedProvider?: WritableAgentProvider;
} = {}) => {
  return createAgentRegistry({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'space-1',
    uiSettings: uiSettingsServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    typeRegistry: createTypeRegistryStub(types),
    builtinProvider: createBuiltinProviderMock(builtinAgents),
    persistedProvider: persistedProvider ?? createPersistedProviderMock(persistedAgents),
  });
};

const investigationType: AgentTypeDefinition = {
  id: 'investigation',
  baseConfiguration: { skill_ids: ['base-skill'], connector_ids: [] },
};

describe('AgentRegistry', () => {
  describe('reads return the raw (unmerged) configuration', () => {
    it('get returns the agent config as-is (no type base folded in)', async () => {
      const agent = createMockedInternalAgent({
        id: 'investigator',
        type: 'investigation',
        configuration: { tools: [], skill_ids: ['my-skill'] },
      });
      const registry = createRegistry({ types: [investigationType], persistedAgents: [agent] });

      const resolved = await registry.get('investigator');

      expect(resolved.configuration).toEqual({ tools: [], skill_ids: ['my-skill'] });
    });
  });

  describe('agent visibility', () => {
    const visibleBuiltin = createMockedInternalAgent({ id: 'visible-builtin', readonly: true });
    const hiddenBuiltin = createMockedInternalAgent({
      id: 'hidden-builtin',
      readonly: true,
      hidden: true,
    });
    const chatAgent = createMockedInternalAgent({ id: 'chat-agent', readonly: false });

    const createVisibilityRegistry = () =>
      createRegistry({
        builtinAgents: [visibleBuiltin, hiddenBuiltin],
        persistedAgents: [chatAgent],
      });

    it('hides agents with hidden:true from list by default', async () => {
      const agents = await createVisibilityRegistry().list();

      expect(agents.map(({ id }) => id)).toEqual(['visible-builtin', 'chat-agent']);
    });

    it('includes hidden agents in list when includeHidden is true', async () => {
      const agents = await createVisibilityRegistry().list({ includeHidden: true });

      expect(agents.map(({ id }) => id)).toEqual([
        'visible-builtin',
        'hidden-builtin',
        'chat-agent',
      ]);
    });

    it('getIds always includes hidden agents (it scopes access, not display)', async () => {
      const registry = createVisibilityRegistry();

      const expected = ['visible-builtin', 'hidden-builtin', 'chat-agent'];
      expect(await registry.getIds()).toEqual(expected);
    });

    it('still resolves hidden agents by id directly', async () => {
      const resolved = await createVisibilityRegistry().get('hidden-builtin');

      expect(resolved.id).toBe('hidden-builtin');
    });

    it('excludes unavailable persisted agents from getIds', async () => {
      const available = createMockedInternalAgent({ id: 'available-agent', readonly: false });
      const unavailable = createMockedInternalAgent({
        id: 'unavailable-agent',
        readonly: false,
        isAvailable: jest.fn(async () => ({
          status: 'unavailable' as const,
          reason: 'feature off',
        })) as any,
      });
      const registry = createRegistry({
        persistedAgents: [available, unavailable],
      });

      await expect(registry.getIds()).resolves.toEqual(['available-agent']);
    });
  });

  describe('create', () => {
    it('rejects an unknown agent type', async () => {
      const registry = createRegistry();

      await expect(
        registry.create({
          id: 'new-agent',
          type: 'unknown-type',
          name: 'New agent',
          description: 'desc',
          configuration: { tools: [] },
        })
      ).rejects.toThrow('Unknown agent type: "unknown-type"');
    });

    it('accepts a registered type and persists it', async () => {
      const registry = createRegistry({ types: [investigationType] });

      const created = await registry.create({
        id: 'new-agent',
        type: 'investigation',
        name: 'New agent',
        description: 'desc',
        configuration: { tools: [] },
      });

      expect(created.type).toBe('investigation');
    });
  });

  describe('update', () => {
    it('passes only the caller-provided delta to the persisted provider', async () => {
      const agent = createMockedInternalAgent({
        id: 'investigator',
        type: 'investigation',
        configuration: { tools: [], skill_ids: ['my-skill'] },
      });
      const persistedProvider = createPersistedProviderMock([agent]);
      const registry = createRegistry({ types: [investigationType], persistedProvider });

      const update = { configuration: { skill_ids: ['my-skill', 'another-skill'] } };
      await registry.update('investigator', update);

      expect(persistedProvider.update).toHaveBeenCalledWith('investigator', update);
    });
  });

  describe('setServiceAccount', () => {
    it('hands the binding to the persisted provider', async () => {
      const agent = createMockedInternalAgent({ id: 'investigator' });
      const persistedProvider = createPersistedProviderMock([agent]);
      const registry = createRegistry({ persistedProvider });

      await registry.setServiceAccount('investigator', 'kibana/sa-1');

      expect(persistedProvider.setServiceAccount).toHaveBeenCalledWith(
        'investigator',
        'kibana/sa-1'
      );
    });

    it('refuses a built-in agent', async () => {
      const registry = createRegistry({
        builtinAgents: [createMockedInternalAgent({ id: 'builtin', readonly: true })],
      });

      await expect(registry.setServiceAccount('builtin', 'kibana/sa-1')).rejects.toThrow(
        'read-only'
      );
    });
  });

  describe('get for a run as a service account', () => {
    it('passes the account through to the persisted provider', async () => {
      const agent = createMockedInternalAgent({ id: 'investigator' });
      const persistedProvider = createPersistedProviderMock([agent]);
      const registry = createRegistry({ persistedProvider });

      await registry.get('investigator', { access: 'use', runAs: 'kibana/sa-1' });

      expect(persistedProvider.get).toHaveBeenCalledWith('investigator', {
        access: 'use',
        runAs: 'kibana/sa-1',
      });
    });

    it('resolves the agent without the access-checked existence lookup', async () => {
      const agent = createMockedInternalAgent({ id: 'investigator' });
      const persistedProvider = createPersistedProviderMock([agent]);
      // A private agent looks absent to the account, which holds no read access to it.
      persistedProvider.has.mockResolvedValue(false);
      const registry = createRegistry({ persistedProvider });

      await expect(
        registry.get('investigator', { access: 'use', runAs: 'kibana/sa-1' })
      ).resolves.toMatchObject({ id: 'investigator' });
      expect(persistedProvider.has).not.toHaveBeenCalled();
    });
  });
});
