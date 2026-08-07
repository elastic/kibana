/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { readVaultPaths } from './read_vault_paths';

const CANARY = 'CANARY-9f3e2ab1-do-not-log';
const ALLOW_TOKEN: unique symbol = Symbol('test-allow-sensitive-output');

describe('readVaultPaths', () => {
  const makeActionsClient = () => ({ execute: jest.fn() } as unknown as jest.Mocked<ActionsClient>);

  it('reads every unique path once, keyed by path, passing the capability token through', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute
      .mockResolvedValueOnce({ status: 'ok', data: { values: { clientId: 'abc' } } } as never)
      .mockResolvedValueOnce({
        status: 'ok',
        data: { values: { tokenUrl: 'https://x' } },
      } as never);

    const result = await readVaultPaths({
      actionsClient,
      vaultConnectorId: 'vault-connector',
      paths: ['secret/data/a', 'secret/data/b'],
      allowSensitiveOutput: ALLOW_TOKEN,
      targetConnectorName: 'My connector',
    });

    expect(result.get('secret/data/a')).toEqual({ clientId: 'abc' });
    expect(result.get('secret/data/b')).toEqual({ tokenUrl: 'https://x' });
    expect(actionsClient.execute).toHaveBeenCalledTimes(2);
    expect(actionsClient.execute).toHaveBeenNthCalledWith(1, {
      actionId: 'vault-connector',
      params: { subAction: 'readSecret', subActionParams: { path: 'secret/data/a' } },
      allowSensitiveOutput: ALLOW_TOKEN,
    });
  });

  it('defaults to an empty object when a path resolves with no values', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockResolvedValueOnce({ status: 'ok', data: {} } as never);

    const result = await readVaultPaths({
      actionsClient,
      vaultConnectorId: 'vault-connector',
      paths: ['secret/data/a'],
      allowSensitiveOutput: ALLOW_TOKEN,
      targetConnectorName: 'My connector',
    });

    expect(result.get('secret/data/a')).toEqual({});
  });

  it('throws a name-only error and never forwards a canary value embedded in a failed execute() result', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockResolvedValueOnce({
      status: 'error',
      message: `denied for token ${CANARY}`,
    } as never);

    await expect(
      readVaultPaths({
        actionsClient,
        vaultConnectorId: 'vault-connector',
        paths: ['secret/data/a'],
        allowSensitiveOutput: ALLOW_TOKEN,
        targetConnectorName: 'My connector',
      })
    ).rejects.toThrow(/Failed to read the Vault secret at path 'secret\/data\/a'/);

    try {
      await readVaultPaths({
        actionsClient,
        vaultConnectorId: 'vault-connector',
        paths: ['secret/data/a'],
        allowSensitiveOutput: ALLOW_TOKEN,
        targetConnectorName: 'My connector',
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(CANARY);
    }
  });

  it('never forwards a canary value embedded in a rejected execute() promise', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockRejectedValue(new Error(`internal failure: ${CANARY}`));

    await expect(
      readVaultPaths({
        actionsClient,
        vaultConnectorId: 'vault-connector',
        paths: ['secret/data/a'],
        allowSensitiveOutput: ALLOW_TOKEN,
        targetConnectorName: 'My connector',
      })
    ).rejects.toThrow(/Failed to read the Vault secret at path 'secret\/data\/a'/);

    try {
      await readVaultPaths({
        actionsClient,
        vaultConnectorId: 'vault-connector',
        paths: ['secret/data/a'],
        allowSensitiveOutput: ALLOW_TOKEN,
        targetConnectorName: 'My connector',
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(CANARY);
    }
  });
});
