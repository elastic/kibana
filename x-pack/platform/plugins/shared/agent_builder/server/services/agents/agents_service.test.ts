/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsServiceMock,
  securityServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { isAllowedBuiltinAgent, isAllowedAgentType } from '@kbn/agent-builder-server/allow_lists';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import { AgentsService } from './agents_service';
import type { AgentsServiceStart } from './types';
import type { AgentsServiceStartDeps } from './agents_service';
import { createMockedAgent, createToolsServiceStartMock } from '../../test_utils';
import { createClient, createSystemClient } from './persisted/client';
import { runSkillRefCleanup } from './persisted/skill_reference_cleanup';
import { runToolRefCleanup } from './persisted/tool_reference_cleanup';

jest.mock('@kbn/agent-builder-server/allow_lists');
jest.mock('./persisted/client');
jest.mock('./persisted/tool_reference_cleanup');
jest.mock('./persisted/skill_reference_cleanup');

const isAllowedBuiltinAgentMock = isAllowedBuiltinAgent as jest.MockedFunction<
  typeof isAllowedBuiltinAgent
>;
const isAllowedAgentTypeMock = isAllowedAgentType as jest.MockedFunction<typeof isAllowedAgentType>;
const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const createSystemClientMock = createSystemClient as jest.MockedFunction<typeof createSystemClient>;
const runToolRefCleanupMock = runToolRefCleanup as jest.MockedFunction<typeof runToolRefCleanup>;
const runSkillRefCleanupMock = runSkillRefCleanup as jest.MockedFunction<typeof runSkillRefCleanup>;

const createStartDeps = (): AgentsServiceStartDeps => ({
  security: securityServiceMock.createStart(),
  elasticsearch: elasticsearchServiceMock.createStart(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  savedObjects: savedObjectsServiceMock.createStartContract(),
  spaces: undefined,
  toolsService: createToolsServiceStartMock(),
});

describe('AgentsService', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let service: AgentsService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new AgentsService();
    isAllowedAgentTypeMock.mockReturnValue(true);
  });

  afterEach(() => {
    isAllowedBuiltinAgentMock.mockReset();
    isAllowedAgentTypeMock.mockReset();
    createClientMock.mockReset();
    createSystemClientMock.mockReset();
    runToolRefCleanupMock.mockReset();
    runSkillRefCleanupMock.mockReset();
  });

  describe('#setup', () => {
    it('allows registering allowed built-in agents', () => {
      isAllowedBuiltinAgentMock.mockReturnValue(true);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedAgent())).not.toThrow();
    });

    it('throws an error trying to register non-allowed built-in agents', () => {
      isAllowedBuiltinAgentMock.mockReturnValue(false);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedAgent())).toThrowErrorMatchingInlineSnapshot(`
        "Built-in agent with id \\"test_agent\\" is not in the list of allowed built-in agents.
                     Please add it to the list of allowed built-in agents in the \\"@kbn/agent-builder-server/allow_lists.ts\\" file."
      `);
    });

    describe('agent types', () => {
      it('registers the default chat type', () => {
        const serviceSetup = service.setup({ logger });

        expect(() =>
          serviceSetup.registerType({ id: chatAgentTypeId, baseConfiguration: {} })
        ).toThrow(`Agent type with id ${chatAgentTypeId} already registered`);
      });

      it('allows registering an agent type and an agent using it', () => {
        isAllowedBuiltinAgentMock.mockReturnValue(true);

        const serviceSetup = service.setup({ logger });
        serviceSetup.registerType({ id: 'investigation', baseConfiguration: { tools: [] } });

        expect(() =>
          serviceSetup.register(createMockedAgent({ type: 'investigation' }))
        ).not.toThrow();
      });

      it('throws when registering a duplicate agent type', () => {
        const serviceSetup = service.setup({ logger });
        serviceSetup.registerType({ id: 'investigation', baseConfiguration: {} });

        expect(() =>
          serviceSetup.registerType({ id: 'investigation', baseConfiguration: {} })
        ).toThrow('Agent type with id investigation already registered');
      });

      it('throws when registering a non-allowed agent type', () => {
        isAllowedAgentTypeMock.mockImplementation((typeId) => typeId === chatAgentTypeId);

        const serviceSetup = service.setup({ logger });

        expect(() =>
          serviceSetup.registerType({ id: 'rogue-type', baseConfiguration: {} })
        ).toThrow('Agent type with id "rogue-type" is not in the list of allowed agent types');
      });

      it('registering an agent with an unknown type does NOT throw at setup (validated at start)', () => {
        isAllowedBuiltinAgentMock.mockReturnValue(true);

        const serviceSetup = service.setup({ logger });

        expect(() =>
          serviceSetup.register(createMockedAgent({ type: 'not-registered' }))
        ).not.toThrow();
      });

      it('throws at start when a registered agent references an unknown type', () => {
        isAllowedBuiltinAgentMock.mockReturnValue(true);

        const serviceSetup = service.setup({ logger });
        serviceSetup.register(createMockedAgent({ type: 'not-registered' }));

        expect(() => service.start(createStartDeps())).toThrow(
          'Built-in agent with id "test_agent" references unknown agent type "not-registered"'
        );
      });
    });
  });

  describe('#start', () => {
    let started: AgentsServiceStart;
    let request: KibanaRequest;
    const ensureAgent = jest.fn();

    beforeEach(() => {
      isAllowedBuiltinAgentMock.mockReturnValue(true);
      service.setup({ logger });
      ensureAgent.mockReset();
      createClientMock.mockResolvedValue({
        getAgentsUsingTools: (params: { toolIds: string[] }) =>
          runToolRefCleanupMock({
            storage: {} as any,
            spaceId: 'default',
            toolIds: params.toolIds,
            logger: undefined,
            checkOnly: true,
          }),
        removeToolRefsFromAgents: (params: { toolIds: string[] }) =>
          runToolRefCleanupMock({
            storage: {} as any,
            spaceId: 'default',
            toolIds: params.toolIds,
            logger: undefined,
          }),
        getAgentsUsingSkills: (params: { skillIds: string[] }) =>
          runSkillRefCleanupMock({
            storage: {} as any,
            spaceId: 'default',
            skillIds: params.skillIds,
            logger: undefined,
            checkOnly: true,
          }),
        removeSkillRefsFromAgents: (params: { skillIds: string[] }) =>
          runSkillRefCleanupMock({
            storage: {} as any,
            spaceId: 'default',
            skillIds: params.skillIds,
            logger: undefined,
          }),
      } as any);
      createSystemClientMock.mockReturnValue({ ensureAgent });
      started = service.start(createStartDeps());
      request = httpServerMock.createKibanaRequest();
    });

    describe('#ensure', () => {
      const agent = {
        id: 'system-agent',
        type: chatAgentTypeId,
        name: 'System agent',
        description: 'Installed at startup',
        configuration: { tools: [] },
      };

      it('uses a system-scoped client for the requested space', async () => {
        await started.ensure({ spaceId: 'space-1', agent });

        expect(createSystemClientMock).toHaveBeenCalledWith(
          expect.objectContaining({ space: 'space-1', logger })
        );
        expect(ensureAgent).toHaveBeenCalledWith(agent);
      });

      it('rejects an unknown agent type', async () => {
        await expect(
          started.ensure({ spaceId: 'space-1', agent: { ...agent, type: 'unknown' } })
        ).rejects.toThrow('unknown agent type "unknown"');
      });
    });

    describe('#getAgentsUsingTools', () => {
      it('returns agents that use the given tool IDs', async () => {
        const agents = [
          { id: 'agent-1', name: 'Agent One' },
          { id: 'agent-2', name: 'Agent Two' },
        ];
        runToolRefCleanupMock.mockResolvedValue({ agents });

        const result = await started.getAgentsUsingTools({ request, toolIds: ['tool-1'] });

        expect(result).toEqual({ agents });
        expect(runToolRefCleanupMock).toHaveBeenCalledTimes(1);
        expect(runToolRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            toolIds: ['tool-1'],
            checkOnly: true,
            spaceId: 'default',
          })
        );
      });

      it('returns empty agents list when runToolRefCleanup returns no agents', async () => {
        runToolRefCleanupMock.mockResolvedValue({ agents: [] });

        const result = await started.getAgentsUsingTools({
          request,
          toolIds: ['tool-1', 'tool-2'],
        });

        expect(result).toEqual({ agents: [] });
        expect(runToolRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            toolIds: ['tool-1', 'tool-2'],
            checkOnly: true,
          })
        );
      });

      it('propagates errors from runToolRefCleanup', async () => {
        const error = new Error('Search failed');
        runToolRefCleanupMock.mockRejectedValue(error);

        await expect(started.getAgentsUsingTools({ request, toolIds: ['tool-1'] })).rejects.toThrow(
          'Search failed'
        );
      });
    });

    describe('#removeToolRefsFromAgents', () => {
      it('calls runToolRefCleanup without checkOnly and returns updated agents', async () => {
        const agents = [{ id: 'agent-1', name: 'Agent 1' }];
        runToolRefCleanupMock.mockResolvedValue({ agents });

        await expect(
          started.removeToolRefsFromAgents({ request, toolIds: ['tool-1', 'tool-2'] })
        ).resolves.toEqual({ agents });

        expect(runToolRefCleanupMock).toHaveBeenCalledTimes(1);
        expect(runToolRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            toolIds: ['tool-1', 'tool-2'],
            spaceId: 'default',
          })
        );
        expect(runToolRefCleanupMock.mock.calls[0][0]).not.toHaveProperty('checkOnly');
      });

      it('propagates errors from runToolRefCleanup', async () => {
        const error = new Error('Bulk update failed');
        runToolRefCleanupMock.mockRejectedValue(error);

        await expect(
          started.removeToolRefsFromAgents({ request, toolIds: ['tool-1'] })
        ).rejects.toThrow('Bulk update failed');
      });
    });

    describe('#getAgentsUsingSkills', () => {
      it('returns agents that use the given skill IDs', async () => {
        const agents = [
          { id: 'agent-1', name: 'Agent One' },
          { id: 'agent-2', name: 'Agent Two' },
        ];
        runSkillRefCleanupMock.mockResolvedValue({ agents });

        const result = await started.getAgentsUsingSkills({ request, skillIds: ['skill-1'] });

        expect(result).toEqual({ agents });
        expect(runSkillRefCleanupMock).toHaveBeenCalledTimes(1);
        expect(runSkillRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            skillIds: ['skill-1'],
            checkOnly: true,
            spaceId: 'default',
          })
        );
      });

      it('returns empty agents list when runSkillRefCleanup returns no agents', async () => {
        runSkillRefCleanupMock.mockResolvedValue({ agents: [] });

        const result = await started.getAgentsUsingSkills({
          request,
          skillIds: ['skill-1', 'skill-2'],
        });

        expect(result).toEqual({ agents: [] });
        expect(runSkillRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            skillIds: ['skill-1', 'skill-2'],
            checkOnly: true,
          })
        );
      });

      it('propagates errors from runSkillRefCleanup', async () => {
        const error = new Error('Search failed');
        runSkillRefCleanupMock.mockRejectedValue(error);

        await expect(
          started.getAgentsUsingSkills({ request, skillIds: ['skill-1'] })
        ).rejects.toThrow('Search failed');
      });
    });

    describe('#removeSkillRefsFromAgents', () => {
      it('calls runSkillRefCleanup without checkOnly and returns updated agents', async () => {
        const agents = [{ id: 'agent-1', name: 'Agent 1' }];
        runSkillRefCleanupMock.mockResolvedValue({ agents });

        await expect(
          started.removeSkillRefsFromAgents({ request, skillIds: ['skill-1', 'skill-2'] })
        ).resolves.toEqual({ agents });

        expect(runSkillRefCleanupMock).toHaveBeenCalledTimes(1);
        expect(runSkillRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            skillIds: ['skill-1', 'skill-2'],
            spaceId: 'default',
          })
        );
        expect(runSkillRefCleanupMock.mock.calls[0][0]).not.toHaveProperty('checkOnly');
      });

      it('propagates errors from runSkillRefCleanup', async () => {
        const error = new Error('Bulk update failed');
        runSkillRefCleanupMock.mockRejectedValue(error);

        await expect(
          started.removeSkillRefsFromAgents({ request, skillIds: ['skill-1'] })
        ).rejects.toThrow('Bulk update failed');
      });
    });
  });
});
