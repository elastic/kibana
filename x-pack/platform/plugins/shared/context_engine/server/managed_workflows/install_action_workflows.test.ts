/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { installActionWorkflows } from './install_action_workflows';

describe('installActionWorkflows', () => {
  const logger = loggingSystemMock.createLogger();
  const client = { install: jest.fn(), ready: jest.fn() };
  const initManagedWorkflowsClient = jest.fn();

  const run = () =>
    installActionWorkflows({
      workflowsExtensions: { initManagedWorkflowsClient } as never,
      owner: 'contextEngine',
      logger,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    client.install.mockResolvedValue(undefined);
    client.ready.mockResolvedValue(undefined);
    initManagedWorkflowsClient.mockResolvedValue(client);
  });

  it('installs the three KI action workflows globally under the plugin’s owner, then signals ready', async () => {
    await run();

    expect(initManagedWorkflowsClient).toHaveBeenCalledWith('contextEngine');
    expect(client.install.mock.calls.map(([id]) => id)).toEqual([
      'system-context-engine-action-add-ki',
      'system-context-engine-action-edit-ki',
      'system-context-engine-action-remove-ki',
    ]);
    for (const [, options] of client.install.mock.calls) {
      expect(options).toEqual({ spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    }
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('keeps installing the rest and skips reconciliation when one install fails', async () => {
    client.install.mockRejectedValueOnce(new Error('boom'));

    await run();

    expect(client.install).toHaveBeenCalledTimes(3);
    expect(client.ready).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('only warns when reconciliation fails', async () => {
    client.ready.mockRejectedValue(new Error('slow'));

    await expect(run()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('slow'));
  });
});
