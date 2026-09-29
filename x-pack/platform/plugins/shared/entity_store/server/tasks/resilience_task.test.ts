/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import { registerResilienceTask } from './resilience_task';
import { createAssetManagerClient } from './factories';
import { shouldDeleteOrphanedEntityStoreTask } from './should_delete_orphaned_task';
import type { EntityStoreCoreSetup } from '../types';

vi.mock('./factories');
vi.mock('./should_delete_orphaned_task');
// wrapTaskRun adds a tracing span around the run callback; here it just invokes it.
vi.mock('../telemetry/traces', () => {
      const mocked = {
      wrapTaskRun: vi.fn(({ run }: { run: () => Promise<unknown> }) => run()),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../telemetry/events', () => {
      const mocked = {
      createReportEvent: vi.fn().mockReturnValue({ reportEvent: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

const createAssetManagerClientMock = createAssetManagerClient as Mock;
const shouldDeleteOrphanedEntityStoreTaskMock = shouldDeleteOrphanedEntityStoreTask as Mock;

const NAMESPACE = 'default';

describe('resilience task', () => {
  let logger: MockedLogger;
  let reinstallSharedAssetsIfMissing: Mock;

  const runResilienceTask = async ({
    namespace = NAMESPACE,
    hasFakeRequest = true,
  }: { namespace?: string; hasFakeRequest?: boolean } = {}) => {
    const taskManager = {
      registerTaskDefinitions: vi.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = {
      analytics: {},
      getStartServices: vi.fn().mockResolvedValue([{}]),
    } as unknown as EntityStoreCoreSetup;

    registerResilienceTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: { id: `resilience:${namespace}`, state: { namespace } },
      fakeRequest: hasFakeRequest ? {} : undefined,
      signal: new AbortController().signal,
    });
    return runner.run();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    logger = loggerMock.create();
    reinstallSharedAssetsIfMissing = vi.fn().mockResolvedValue(false);

    shouldDeleteOrphanedEntityStoreTaskMock.mockResolvedValue(false);
    createAssetManagerClientMock.mockResolvedValue({
      assetManagerClient: { reinstallSharedAssetsIfMissing },
    });
  });

  it('self-deletes when the entity store is orphaned (no engine descriptors)', async () => {
    shouldDeleteOrphanedEntityStoreTaskMock.mockResolvedValue(true);

    const result = await runResilienceTask();

    expect(reinstallSharedAssetsIfMissing).not.toHaveBeenCalled();
    expect(result).toEqual({ state: { namespace: NAMESPACE }, shouldDeleteTask: true });
  });

  it('calls reinstallSharedAssetsIfMissing when entity store is installed', async () => {
    const result = await runResilienceTask();

    expect(reinstallSharedAssetsIfMissing).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ state: { namespace: NAMESPACE } });
  });

  it('returns state and logs error when fakeRequest is missing', async () => {
    const result = await runResilienceTask({ hasFakeRequest: false });

    expect(reinstallSharedAssetsIfMissing).not.toHaveBeenCalled();
    expect(result).toEqual({ state: { namespace: NAMESPACE } });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No fake request found'));
  });

  it('throws when namespace is missing from task state', async () => {
    const taskManager = {
      registerTaskDefinitions: vi.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = { analytics: {} } as unknown as EntityStoreCoreSetup;

    registerResilienceTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: { id: 'resilience:missing', state: {} },
      fakeRequest: {},
      signal: new AbortController().signal,
    });

    await expect(runner.run()).rejects.toThrow('Namespace is required');
  });
});
