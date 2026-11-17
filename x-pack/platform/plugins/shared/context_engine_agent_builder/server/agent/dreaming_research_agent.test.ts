/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { httpServerMock } from '@kbn/core/server/mocks';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  CONTEXT_ENGINE_DREAMING_RESEARCH_AGENT_ID,
  registerDreamingResearchAgent,
} from './dreaming_research_agent';

const register = (getReadOnlyConnectorIds = jest.fn(async () => ['notion-read'])) => {
  const registerAgent = jest.fn();
  registerDreamingResearchAgent(
    { agents: { register: registerAgent } } as unknown as AgentBuilderPluginSetup,
    getReadOnlyConnectorIds
  );
  return {
    definition: registerAgent.mock.calls[0][0] as BuiltInAgentDefinition,
    getReadOnlyConnectorIds,
  };
};

describe('dreaming research agent', () => {
  it('is a hidden agent with its own id', () => {
    const { definition } = register();

    expect(definition.id).toBe(CONTEXT_ENGINE_DREAMING_RESEARCH_AGENT_ID);
    expect(definition.hidden).toBe(true);
  });

  it('reads Elasticsearch and runs connector sub-actions, and nothing else', async () => {
    const { definition } = register();
    const request = httpServerMock.createKibanaRequest();
    const configuration =
      typeof definition.configuration === 'function'
        ? await definition.configuration({ request, spaceId: 'default' })
        : definition.configuration;

    expect(configuration.tools).toEqual([
      {
        tool_ids: [
          platformCoreTools.search,
          platformCoreTools.getIndexMapping,
          platformCoreTools.executeEsql,
          platformCoreTools.executeConnectorSubAction,
        ],
      },
    ]);
    expect(configuration.enable_elastic_capabilities).toBe(false);
    expect(configuration.skill_ids).toEqual([]);
    expect(configuration.instructions).toMatch(/Never try to create, change or delete anything/);
  });

  it('may only use the read-only connectors of the caller, resolved on each run', async () => {
    const { definition, getReadOnlyConnectorIds } = register();
    const request = httpServerMock.createKibanaRequest();

    if (typeof definition.configuration !== 'function') {
      throw new Error('Expected the configuration to be resolved per run');
    }
    const configuration = await definition.configuration({ request, spaceId: 'default' });

    expect(getReadOnlyConnectorIds).toHaveBeenCalledWith(request);
    expect(configuration.connector_ids).toEqual(['notion-read']);
  });
});
