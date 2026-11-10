/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createConnectorSkillsService } from './connector_skills_service';

describe('createConnectorSkillsService', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();

  const setup = (connectors: Array<{ id: string; actionTypeId: string }>) => {
    const getAll = jest.fn().mockResolvedValue(connectors);
    const getActionsClientWithRequest = jest.fn().mockResolvedValue({ getAll });
    const actions = { getActionsClientWithRequest } as unknown as ActionsPluginStart;
    return { service: createConnectorSkillsService({ actions, request, logger }), getAll };
  };

  const CONNECTORS = [
    { id: 'gh-1', actionTypeId: '.github' },
    { id: 'gh-2', actionTypeId: '.github' },
    { id: 'pd-1', actionTypeId: '.pagerduty_mcp' },
    { id: 'slack-1', actionTypeId: '.slack' },
  ];

  it('returns no skills, without loading connectors, when the agent has no connectors', async () => {
    const { service, getAll } = setup(CONNECTORS);

    await expect(service.resolveSkillIds([])).resolves.toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
  });

  it('returns the skills for the types of the agent connectors', async () => {
    const { service } = setup(CONNECTORS);

    await expect(service.resolveSkillIds(['pd-1'])).resolves.toEqual([
      'platform.connectors.pagerduty',
    ]);
  });

  it('returns a skill once even when the agent has several connectors of that type', async () => {
    const { service } = setup(CONNECTORS);

    const ids = await service.resolveSkillIds(['gh-1', 'gh-2', 'pd-1']);
    expect([...ids].sort()).toEqual([
      'platform.connectors.github',
      'platform.connectors.pagerduty',
    ]);
  });

  it('ignores connector types without skills and connectors that do not exist', async () => {
    const { service } = setup(CONNECTORS);

    await expect(service.resolveSkillIds(['slack-1', 'not-a-connector'])).resolves.toEqual([]);
  });

  it('does not grant a skill for a connector the agent does not have', async () => {
    const { service } = setup(CONNECTORS);

    await expect(service.resolveSkillIds(['gh-1'])).resolves.toEqual([
      'platform.connectors.github',
    ]);
  });

  it('returns no skills and warns when connectors cannot be loaded', async () => {
    const getActionsClientWithRequest = jest.fn().mockRejectedValue(new Error('boom'));
    const service = createConnectorSkillsService({
      actions: { getActionsClientWithRequest } as unknown as ActionsPluginStart,
      request,
      logger,
    });

    await expect(service.resolveSkillIds(['gh-1'])).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
