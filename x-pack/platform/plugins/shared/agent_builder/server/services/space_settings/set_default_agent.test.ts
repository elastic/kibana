/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentsServiceStart } from '../agents';
import type { SpaceSettingsService } from './space_settings_service';
import { setSpaceDefaultAgent } from './set_default_agent';

const setup = (accessMode: AgentAccessControlMode = AgentAccessControlMode.Public) => {
  const get = jest.fn().mockResolvedValue({ access_control: { access_mode: accessMode } });
  const agents = {
    getRegistry: jest.fn().mockResolvedValue({ get }),
  } as unknown as Pick<AgentsServiceStart, 'getRegistry'>;
  const spaceSettings = {
    get: jest.fn(),
    set: jest.fn().mockImplementation(async (_request, defaultAgentId) => ({ defaultAgentId })),
  } as unknown as SpaceSettingsService;

  return { agents, spaceSettings, request: httpServerMock.createKibanaRequest(), getAgent: get };
};

describe('setSpaceDefaultAgent', () => {
  it('assigns a public agent as the default of the request space', async () => {
    const { agents, spaceSettings, request } = setup();

    const result = await setSpaceDefaultAgent({
      agents,
      spaceSettings,
      request,
      defaultAgentId: 'nightshift.assistant',
    });

    expect(result).toEqual({ defaultAgentId: 'nightshift.assistant' });
    expect(spaceSettings.set).toHaveBeenCalledWith(request, 'nightshift.assistant');
  });

  it('refuses a private agent, which nobody else in the space can run', async () => {
    const { agents, spaceSettings, request } = setup(AgentAccessControlMode.Private);

    await expect(
      setSpaceDefaultAgent({
        agents,
        spaceSettings,
        request,
        defaultAgentId: 'my-private-agent',
      })
    ).rejects.toThrow(/private agent cannot be assigned as the space default/);
    expect(spaceSettings.set).not.toHaveBeenCalled();
  });

  it('clears the assignment without looking the agent up', async () => {
    const { agents, spaceSettings, request } = setup();

    await setSpaceDefaultAgent({ agents, spaceSettings, request, defaultAgentId: null });

    expect(agents.getRegistry).not.toHaveBeenCalled();
    expect(spaceSettings.set).toHaveBeenCalledWith(request, null);
  });
});
