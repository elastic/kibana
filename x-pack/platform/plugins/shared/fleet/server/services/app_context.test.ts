/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedWorkflowsClient } from './app_context';
import { appContextService } from './app_context';

describe('getManagedWorkflowsClient', () => {
  const client = { isWorkflowsAvailable: true } as ManagedWorkflowsClient;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the client once the initialization resolves', async () => {
    appContextService.setManagedWorkflowsClientInit(Promise.resolve(client));

    await expect(appContextService.getManagedWorkflowsClient()).resolves.toBe(client);
  });

  it('returns undefined while Workflows is not available and the client once it is', async () => {
    const reactiveClient = { isWorkflowsAvailable: false } as ManagedWorkflowsClient;
    appContextService.setManagedWorkflowsClientInit(Promise.resolve(reactiveClient));

    await expect(appContextService.getManagedWorkflowsClient()).resolves.toBeUndefined();

    reactiveClient.isWorkflowsAvailable = true;
    await expect(appContextService.getManagedWorkflowsClient()).resolves.toBe(reactiveClient);

    reactiveClient.isWorkflowsAvailable = false;
    await expect(appContextService.getManagedWorkflowsClient()).resolves.toBeUndefined();
  });

  it('returns undefined when the initialization never settles', async () => {
    appContextService.setManagedWorkflowsClientInit(new Promise(() => {}));

    const pending = appContextService.getManagedWorkflowsClient();
    await jest.advanceTimersByTimeAsync(30_000);

    await expect(pending).resolves.toBeUndefined();
  });

  it('does not leave a pending timer after the initialization resolves', async () => {
    appContextService.setManagedWorkflowsClientInit(Promise.resolve(client));

    await appContextService.getManagedWorkflowsClient();

    expect(jest.getTimerCount()).toBe(0);
  });
});
