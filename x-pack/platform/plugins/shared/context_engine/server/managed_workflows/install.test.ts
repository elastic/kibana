/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getManagedWorkflowDefinitions } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { CONTEXT_ENGINE_WORKFLOW_OWNER, installManagedWorkflows } from './install';

const createClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
});

const createExtensions = (client: ReturnType<typeof createClient>) =>
  ({
    initManagedWorkflowsClient: jest.fn().mockResolvedValue(client),
  } as unknown as WorkflowsExtensionsServerPluginStart);

const installedIds = (client: ReturnType<typeof createClient>): string[] =>
  client.install.mock.calls.map(([workflowId]) => workflowId);

describe('installManagedWorkflows', () => {
  it('installs every static definition this plugin owns before marking the owner ready', async () => {
    const client = createClient();
    const workflowsExtensions = createExtensions(client);

    await installManagedWorkflows({
      workflowsExtensions,
      logger: loggingSystemMock.createLogger(),
    });

    // The registry is the source of truth for what this owner has to install. Anything static
    // missing here would be pruned by the ready() below as an orphan.
    const owned = getManagedWorkflowDefinitions()
      .filter(
        ({ pluginId, management }) =>
          pluginId === CONTEXT_ENGINE_WORKFLOW_OWNER && management.lifecycle === 'static'
      )
      .map(({ id }) => id);

    expect(owned.length).toBeGreaterThan(0);
    expect(installedIds(client).sort()).toEqual([...owned].sort());
    expect(client.install).toHaveBeenCalledWith(owned[0], { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('does not mark the owner ready when an install fails, so nothing is pruned', async () => {
    const client = createClient();
    client.install.mockRejectedValue(new Error('install failed'));
    const logger = loggingSystemMock.createLogger();

    await installManagedWorkflows({ workflowsExtensions: createExtensions(client), logger });

    expect(client.ready).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
