/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentRegistry } from '@kbn/agent-builder-server/agents';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
} from '../../agents/investigation';
import { installInvestigationAgent } from './install_investigation_agent';

const createAgentBuilder = (registry: jest.Mocked<AgentRegistry>): AgentBuilderPluginStart =>
  ({
    agents: {
      getRegistry: jest.fn().mockResolvedValue(registry),
    },
  } as unknown as AgentBuilderPluginStart);

const createRegistry = (): jest.Mocked<AgentRegistry> =>
  ({
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as jest.Mocked<AgentRegistry>);

const createExistingAgent = ({
  type,
  connectorIds = [],
}: {
  type: string;
  connectorIds?: string[];
}): Awaited<ReturnType<AgentRegistry['get']>> => ({
  id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
  type,
  name: 'Streams Investigator',
  description: 'Investigation agent',
  readonly: false,
  configuration: { tools: [], connector_ids: connectorIds },
  isAvailable: async () => ({ status: 'available' }),
});

describe('installInvestigationAgent', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();

  it('creates a persisted typed agent with an empty user-managed delta', async () => {
    const registry = createRegistry();
    registry.has.mockResolvedValue(false);

    await installInvestigationAgent({
      agentBuilder: createAgentBuilder(registry),
      request,
      logger,
    });

    expect(registry.create).toHaveBeenCalledWith({
      id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
      type: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
      name: 'Streams Investigator',
      description: expect.any(String),
      labels: ['observability', 'streams', 'significant-events', 'investigation', 'root-cause'],
      avatar_symbol: 'SI',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    });
  });

  it('leaves an existing derived agent untouched', async () => {
    const registry = createRegistry();
    registry.has.mockResolvedValue(true);
    registry.get.mockResolvedValue(
      createExistingAgent({
        type: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
        connectorIds: ['github'],
      })
    );

    await installInvestigationAgent({
      agentBuilder: createAgentBuilder(registry),
      request,
      logger,
    });

    expect(registry.create).not.toHaveBeenCalled();
    expect(registry.update).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing agent with the same id and a different type', async () => {
    const registry = createRegistry();
    registry.has.mockResolvedValue(true);
    registry.get.mockResolvedValue(createExistingAgent({ type: 'chat' }));

    await installInvestigationAgent({
      agentBuilder: createAgentBuilder(registry),
      request,
      logger,
    });

    expect(registry.create).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('already used'));
  });

  it('accepts a concurrent create when another Kibana node installs the agent first', async () => {
    const registry = createRegistry();
    registry.has.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    registry.create.mockRejectedValue(new Error('already exists'));

    await expect(
      installInvestigationAgent({
        agentBuilder: createAgentBuilder(registry),
        request,
        logger,
      })
    ).resolves.toBeUndefined();
  });
});
