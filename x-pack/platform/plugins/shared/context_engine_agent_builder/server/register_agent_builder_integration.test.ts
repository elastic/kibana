/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentBuilderPluginSetup, AiIndexResolver } from '@kbn/agent-builder-server';
import { registerContextEngineAgentBuilderIntegration } from './register_agent_builder_integration';
import { CONTEXT_ENGINE_SETUP_AGENT_ID } from './agent/context_engine_agent';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import {
  ANALYZE_AND_IMPROVE_SKILL_ID,
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
  CONTEXT_ENGINE_SIGNALS_SKILL_ID,
} from '../common/agent_builder_skills';
import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import type {
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderStartDependencies,
} from './types';

jest.mock('./agent_builder/tools', () => ({
  registerAgentBuilderTools: jest.fn(),
}));
jest.mock('./attachment_types', () => ({
  registerAttachmentTypes: jest.fn(),
}));

const request = {} as KibanaRequest;

describe('registerContextEngineAgentBuilderIntegration', () => {
  const setup = ({
    aiIndices,
    authorized = true,
  }: {
    aiIndices: unknown[];
    /** Outcome of the privilege check: granted, denied, or the error it rejects with. */
    authorized?: boolean | Error;
  }) => {
    const checkPrivileges =
      authorized instanceof Error
        ? jest.fn().mockRejectedValue(authorized)
        : jest.fn().mockResolvedValue({ hasAllRequested: authorized });
    const security = {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      },
    };

    const list = jest.fn().mockResolvedValue(aiIndices);
    const getAiIndexDataReadService = jest.fn().mockReturnValue({ list });
    const asCurrentUser = {};
    const asScoped = jest.fn().mockReturnValue({ asCurrentUser });
    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        { elasticsearch: { client: { asScoped } } },
        {
          contextEngine: { getAiIndexDataReadService },
          security,
        },
        {},
      ]),
    } as unknown as CoreSetup<
      ContextEngineAgentBuilderStartDependencies,
      ContextEngineAgentBuilderPluginStart
    >;

    let resolver: AiIndexResolver | undefined;
    const register = jest.fn();
    const agentBuilder = {
      agents: {
        register,
        registerType: jest.fn(),
        registerAiIndexResolver: jest.fn((registered: AiIndexResolver) => {
          resolver = registered;
        }),
      },
    } as unknown as AgentBuilderPluginSetup;

    registerContextEngineAgentBuilderIntegration({
      coreSetup,
      agentBuilder,
      workflowsManagement: {} as any,
    });

    if (!resolver) {
      throw new Error('Expected an AI Index resolver to be registered');
    }
    return {
      resolver,
      register,
      list,
      getAiIndexDataReadService,
      asScoped,
      asCurrentUser,
      security,
      checkPrivileges,
    };
  };

  it('registers the tools with a Context Engine start accessor', async () => {
    const { getAiIndexDataReadService } = setup({ aiIndices: [] });
    const { registerAgentBuilderTools } = jest.requireMock('./agent_builder/tools');

    const [{ getContextEngineStart }] = registerAgentBuilderTools.mock.calls.at(-1);

    await expect(getContextEngineStart()).resolves.toEqual({ getAiIndexDataReadService });
  });

  it('reads readable AI Indices as the requesting user through the data read service', async () => {
    const { resolver, getAiIndexDataReadService, asScoped, asCurrentUser } = setup({
      aiIndices: [],
    });

    await resolver({ ids: ['my-custom'], request });

    expect(asScoped).toHaveBeenCalledWith(request);
    expect(getAiIndexDataReadService).toHaveBeenCalledWith({ esClient: asCurrentUser, request });
  });

  it('registers a resolver mapping registry items to id, esqlTarget (dest.value) and description', async () => {
    const { resolver } = setup({
      aiIndices: [
        {
          id: 'my-custom',
          dest: { type: 'index', value: 'ai-index-idx-custom' },
          description: 'Support tickets.',
          memory_enabled: true,
        },
      ],
    });

    expect(await resolver({ ids: ['my-custom'], request })).toEqual([
      {
        id: 'my-custom',
        esqlTarget: 'ai-index-idx-custom',
        description: 'Support tickets.',
        memoryEnabled: true,
      },
    ]);
  });

  it('asks the service for the requested ids only, so just those are probed', async () => {
    const { resolver, list } = setup({
      aiIndices: [
        {
          id: 'wanted',
          dest: { type: 'index', value: 'idx-wanted' },
          memory_enabled: false,
        },
      ],
    });

    expect(await resolver({ ids: ['wanted', 'unknown'], request })).toEqual([
      { id: 'wanted', esqlTarget: 'idx-wanted', memoryEnabled: false },
    ]);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(['wanted', 'unknown']);
  });

  it('checks the Context Engine read privilege for the request before disclosing details', async () => {
    const { resolver, security, checkPrivileges } = setup({
      aiIndices: [{ id: 'my-custom', dest: { type: 'index', value: 'idx-custom' } }],
    });

    await resolver({ ids: ['my-custom'], request });

    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
    expect(checkPrivileges).toHaveBeenCalledWith({ kibana: ['api:contextEngine:read'] });
  });

  it('returns no details when the user lacks the Context Engine read privilege', async () => {
    const { resolver, list } = setup({
      aiIndices: [{ id: 'my-custom', dest: { type: 'index', value: 'idx-custom' } }],
      authorized: false,
    });

    expect(await resolver({ ids: ['my-custom'], request })).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it('propagates privilege-check failures so callers fail closed', async () => {
    const { resolver, list } = setup({
      aiIndices: [{ id: 'my-custom', dest: { type: 'index', value: 'idx-custom' } }],
      authorized: new Error('cluster unreachable'),
    });

    await expect(resolver({ ids: ['my-custom'], request })).rejects.toThrow('cluster unreachable');
    expect(list).not.toHaveBeenCalled();
  });

  it('registers the Context Engine Setup agent as a built-in during setup', () => {
    const { register } = setup({ aiIndices: [] });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: CONTEXT_ENGINE_SETUP_AGENT_ID,
        type: chatAgentTypeId,
        availability: expect.objectContaining({
          cacheMode: 'space',
          handler: expect.any(Function),
        }),
        configuration: expect.objectContaining({
          enable_elastic_capabilities: false,
          subagent_ids: [SELF_AGENT_ID],
          skill_ids: expect.arrayContaining([
            ANALYZE_AND_IMPROVE_SKILL_ID,
            AI_INDEX_AUTOMATIONS_SKILL_ID,
            AI_INDEX_SOURCES_SKILL_ID,
            KI_RETRIEVAL_SKILL_ID,
            CONTEXT_ENGINE_SIGNALS_SKILL_ID,
          ]),
        }),
      })
    );
  });

  it('hides the agent in spaces where Context Engine is disabled', async () => {
    const { register } = setup({ aiIndices: [] });
    const { availability } = register.mock.calls[0][0];

    const unavailable = await availability.handler({
      uiSettings: { get: jest.fn().mockResolvedValue(false) } as any,
      request: {} as any,
      spaceId: 'my-space',
    });
    expect(unavailable.status).toBe('unavailable');

    const available = await availability.handler({
      uiSettings: { get: jest.fn().mockResolvedValue(true) } as any,
      request: {} as any,
      spaceId: 'my-space',
    });
    expect(available.status).toBe('available');
  });
});
