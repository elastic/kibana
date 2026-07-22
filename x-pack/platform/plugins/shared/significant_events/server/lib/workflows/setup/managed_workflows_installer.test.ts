/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { createManagedWorkflowsInstaller } from './managed_workflows_installer';

// Significant events is gated solely by the availability flag now, so the installer always writes
// the full set: 8 base workflows + 4 memory workflows (both via `installWorkflows`) + 1 investigation
// workflow.
const BASE_WORKFLOW_COUNT = 8;
const MEMORY_WORKFLOW_COUNT = 4;
const INVESTIGATION_WORKFLOW_COUNT = 1;
const TOTAL_WORKFLOW_COUNT =
  BASE_WORKFLOW_COUNT + MEMORY_WORKFLOW_COUNT + INVESTIGATION_WORKFLOW_COUNT;

const createClientMock = () => {
  const client = {
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<PluginScopedManagedWorkflowsApi>;
  return client;
};

const installedIds = (client: jest.Mocked<PluginScopedManagedWorkflowsApi>) =>
  client.install.mock.calls.map((call) => call[0]);

const createInstaller = (
  overrides: Partial<Parameters<typeof createManagedWorkflowsInstaller>[0]> = {}
) => {
  const client = createClientMock();
  const installer = createManagedWorkflowsInstaller({
    getClient: jest.fn().mockResolvedValue(client),
    isAvailable: jest.fn().mockResolvedValue(true),
    logger: loggerMock.create(),
    ...overrides,
  });
  return { client, installer };
};

describe('createManagedWorkflowsInstaller', () => {
  it('skips installation and never creates a client when availability is disabled', async () => {
    const getClient = jest.fn();
    const { installer } = createInstaller({
      getClient,
      isAvailable: jest.fn().mockResolvedValue(false),
    });

    await installer.install();

    expect(getClient).not.toHaveBeenCalled();
  });

  it('installs nothing while unavailable, then installs and reconciles once the flag flips on', async () => {
    const { client, installer } = createInstaller({
      isAvailable: jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true),
    });

    await installer.install();
    expect(client.install).not.toHaveBeenCalled();
    expect(client.ready).not.toHaveBeenCalled();

    await installer.install();
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT);
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('installs the full workflow set and calls ready() once when available', async () => {
    const { client, installer } = createInstaller();

    await installer.install();

    expect(installedIds(client)).toContain(SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID);
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT);
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('installs the full set before calling ready() so reconciliation never sees a partial set', async () => {
    const { client, installer } = createInstaller();

    let installCountAtReady = -1;
    client.ready.mockImplementation(async () => {
      installCountAtReady = client.install.mock.calls.length;
    });

    await installer.install();

    // base + memory + investigation, all installed before ready() closes the window.
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT);
    expect(installCountAtReady).toBe(TOTAL_WORKFLOW_COUNT);
  });

  it('installs memory workflows when available', async () => {
    const { client, installer } = createInstaller();

    await installer.install();

    expect(installedIds(client)).toContain(SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID);
  });

  it('installs the investigation workflow when available', async () => {
    const { client, installer } = createInstaller();

    await installer.install();

    expect(installedIds(client)).toContain(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID);
  });

  it('re-installs on later calls but reconciles (ready) only once', async () => {
    const { client, installer } = createInstaller();

    await installer.install();
    await installer.install();

    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT * 2);
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent installs and still reconciles only once', async () => {
    const { client, installer } = createInstaller();

    await Promise.all([installer.install(), installer.install()]);

    expect(client.ready).toHaveBeenCalledTimes(1);
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT * 2);
  });

  it('propagates install failures and retries reconciliation on the next call', async () => {
    const { client, installer } = createInstaller();
    client.ready.mockRejectedValueOnce(new Error('reconcile boom'));

    await expect(installer.install()).rejects.toThrow('reconcile boom');

    // The window was never closed, so the next install retries ready().
    await installer.install();
    expect(client.ready).toHaveBeenCalledTimes(2);
  });

  it('keeps the queue alive after a failure so later flips still install', async () => {
    const { client, installer } = createInstaller();
    client.install.mockRejectedValueOnce(new Error('install boom'));

    await expect(installer.install()).rejects.toThrow('install boom');

    await expect(installer.install()).resolves.toBeUndefined();
    expect(client.ready).toHaveBeenCalledTimes(1);
  });
});
