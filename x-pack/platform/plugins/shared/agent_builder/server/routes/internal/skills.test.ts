/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { kiRetrievalSkillId } from '@kbn/agent-builder-common';
import { registerInternalSkillsRoutes } from './skills';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';
import type { ListAgentSkillsResponse } from '../../../common/http_api/skills';

type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

describe('registerInternalSkillsRoutes', () => {
  const handlers = new Map<string, Handler>();
  let mockResolveAgentConfiguration: jest.Mock;
  let mockResolveAgentBaseConfiguration: jest.Mock;
  let mockBulkGet: jest.Mock;

  const agent = {
    id: 'custom-agent',
    type: 'chat',
    configuration: { tools: [], skill_ids: ['own-skill'], enable_elastic_capabilities: false },
  };

  const kiRetrievalSkill = {
    id: kiRetrievalSkillId,
    name: kiRetrievalSkillId,
    description: 'Retrieve context from a Context Engine AI Index.',
    getRegistryTools: jest.fn().mockResolvedValue([]),
    readonly: true,
  };

  const ownSkill = {
    id: 'own-skill',
    name: 'own-skill',
    description: 'A skill the agent selected itself.',
    getRegistryTools: jest.fn().mockResolvedValue([]),
    readonly: false,
  };
  const skillsById = new Map<string, object>([
    [kiRetrievalSkillId, kiRetrievalSkill],
    [ownSkill.id, ownSkill],
  ]);

  const mockContext = {
    // `wrapHandler` gates every route on the license before the handler body runs.
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  };

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
  };

  const callListAgentSkills = () =>
    handlers.get(`${internalApiPath}/agents/{agentId}/_skills`)!(
      mockContext,
      { params: { agentId: agent.id } },
      mockResponse
    ) as Promise<{ type: string; body: ListAgentSkillsResponse }>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();

    mockResolveAgentConfiguration = jest.fn().mockResolvedValue({
      ...agent.configuration,
      skill_ids: [kiRetrievalSkillId, ownSkill.id],
    });
    mockResolveAgentBaseConfiguration = jest.fn().mockResolvedValue({
      skill_ids: [kiRetrievalSkillId],
    });
    mockBulkGet = jest.fn(
      async (ids: string[]) =>
        new Map(ids.filter((id) => skillsById.has(id)).map((id) => [id, skillsById.get(id)]))
    );

    const getInternalServices = jest.fn().mockReturnValue({
      agents: {
        getRegistry: jest.fn().mockResolvedValue({ get: jest.fn().mockResolvedValue(agent) }),
        resolveAgentConfiguration: mockResolveAgentConfiguration,
        resolveAgentBaseConfiguration: mockResolveAgentBaseConfiguration,
      },
      skills: {
        getRegistry: jest.fn().mockResolvedValue({ bulkGet: mockBulkGet }),
      },
    });

    const mockRouter = {
      get: jest.fn().mockImplementation((config: { path: string }, routeHandler: Handler) => {
        handlers.set(config.path, routeHandler);
      }),
      post: jest.fn(),
    } as unknown as jest.Mocked<IRouter>;

    registerInternalSkillsRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  describe('GET /agents/{agentId}/_skills', () => {
    it('resolves skills from the configuration merged with the agent type base', async () => {
      await callListAgentSkills();

      expect(mockResolveAgentConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ agent })
      );
      expect(mockBulkGet).toHaveBeenCalledWith([kiRetrievalSkillId, ownSkill.id]);
    });

    it("flags skills from the agent type's base as default, and the agent's own as not", async () => {
      const result = await callListAgentSkills();

      expect(mockResolveAgentBaseConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ agentType: agent.type })
      );
      expect(result.body.results.map(({ id, is_default: isDefault }) => [id, isDefault])).toEqual([
        [kiRetrievalSkillId, true],
        [ownSkill.id, false],
      ]);
    });

    it('flags nothing as default when the agent type has no base skills', async () => {
      mockResolveAgentBaseConfiguration.mockResolvedValue({});

      const result = await callListAgentSkills();

      expect(result.body.results.map(({ is_default: isDefault }) => isDefault)).toEqual([
        false,
        false,
      ]);
    });
  });
});
