/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { MEMORY_WORKFLOW_IDS } from '../../maintenance/managed_workflow_targets';
import { BASE_WORKFLOWS_TO_INSTALL } from './install_workflows';
import { createManagedWorkflowsInstaller } from './managed_workflows_installer';

const ALWAYS_INSTALLED_WORKFLOW_IDS = [
  ...BASE_WORKFLOWS_TO_INSTALL.map(({ workflowId }) => workflowId),
  ...MEMORY_WORKFLOW_IDS,
];
const ENABLED_WORKFLOW_IDS = [
  ...ALWAYS_INSTALLED_WORKFLOW_IDS,
  SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
];
const TOTAL_WORKFLOW_COUNT = ENABLED_WORKFLOW_IDS.length;
const TOTAL_WORKFLOW_COUNT_WITHOUT_CODE_EXTRACTION = ALWAYS_INSTALLED_WORKFLOW_IDS.length;

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
    isCodeExtractionAvailable: jest.fn().mockResolvedValue(true),
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

    expect(installedIds(client)).toEqual(expect.arrayContaining(ENABLED_WORKFLOW_IDS));
    expect(new Set(installedIds(client))).toEqual(new Set(ENABLED_WORKFLOW_IDS));
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

    // base + memory, all installed before ready() closes the window.
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT);
    expect(installCountAtReady).toBe(TOTAL_WORKFLOW_COUNT);
  });

  it('installs memory workflows globally when available', async () => {
    const { client, installer } = createInstaller();

    await installer.install();

    const memoryWorkflowIds = [
      SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
      SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
      SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
      SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
    ];

    for (const workflowId of memoryWorkflowIds) {
      expect(client.install).toHaveBeenCalledWith(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    }
  });

  it('installs the code-extraction workflow when code KI extraction is enabled', async () => {
    const { client, installer } = createInstaller();

    await installer.install();

    expect(installedIds(client)).toContain(SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID);
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT);
  });

  it('excludes the code-extraction workflow when code KI extraction is disabled', async () => {
    const { client, installer } = createInstaller({
      isCodeExtractionAvailable: jest.fn().mockResolvedValue(false),
    });

    await installer.install();

    expect(installedIds(client)).not.toContain(SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID);
    expect(client.uninstall).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
      {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      }
    );
    expect(new Set(installedIds(client))).toEqual(new Set(ALWAYS_INSTALLED_WORKFLOW_IDS));
    expect(client.install).toHaveBeenCalledTimes(TOTAL_WORKFLOW_COUNT_WITHOUT_CODE_EXTRACTION);
    // The rest of the set still installs and reconciliation still closes.
    expect(installedIds(client)).toContain(SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID);
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('reacts to false→true and true→false flag changes without restart', async () => {
    const isCodeExtractionAvailable = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { client, installer } = createInstaller({ isCodeExtractionAvailable });

    await installer.install();
    expect(client.uninstall).toHaveBeenCalledTimes(1);
    await installer.install();
    expect(installedIds(client)).toContain(SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID);
    await installer.install();
    expect(client.uninstall).toHaveBeenCalledTimes(2);
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
