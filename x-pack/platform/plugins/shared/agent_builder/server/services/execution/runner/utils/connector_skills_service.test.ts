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
    const get = jest.fn(async ({ id }: { id: string }) => {
      const connector = connectors.find((c) => c.id === id);
      if (!connector) throw new Error(`Saved object [action/${id}] not found`);
      return connector;
    });
    const getActionsClientWithRequest = jest.fn().mockResolvedValue({ get });
    const actions = { getActionsClientWithRequest } as unknown as ActionsPluginStart;
    return { service: createConnectorSkillsService({ actions, request, logger }), get };
  };

  const CONNECTORS = [
    { id: 'gh-1', actionTypeId: '.github' },
    { id: 'gh-2', actionTypeId: '.github' },
    { id: 'pd-1', actionTypeId: '.pagerduty_mcp' },
    { id: 'slack-1', actionTypeId: '.slack' },
  ];

  it('returns no skills, without loading connectors, when the agent has no connectors', async () => {
    const { service, get } = setup(CONNECTORS);

    await expect(service.resolveSkillIds([])).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns each skill once for every connector type, skipping types without skills and missing ids', async () => {
    const { service } = setup(CONNECTORS);

    const ids = await service.resolveSkillIds([
      'gh-1',
      'gh-2',
      'pd-1',
      'slack-1',
      'not-a-connector',
    ]);
    expect([...ids].sort()).toEqual([
      'platform.connectors.github',
      'platform.connectors.pagerduty',
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
