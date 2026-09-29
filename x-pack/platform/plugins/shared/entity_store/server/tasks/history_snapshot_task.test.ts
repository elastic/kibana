/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { registerHistorySnapshotTask } from './history_snapshot_task';
import type { EntityStoreCoreSetup } from '../types';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

vi.mock('./should_delete_orphaned_task', () => {
      const mocked = {
      shouldDeleteOrphanedEntityStoreTask: vi.fn().mockResolvedValue(false),
    };
      return { ...mocked, default: mocked };
    });
// Short-circuit tracing: return a canned result without invoking the inner run
// so the test focuses on the executionContext wrap introduced by this PR.
vi.mock('../telemetry/traces', () => {
      const mocked = {
      wrapTaskRun: vi.fn().mockResolvedValue({ state: {} }),
    };
      return { ...mocked, default: mocked };
    });

describe('registerHistorySnapshotTask — execution context wrap', () => {
  it('invokes coreStart.executionContext.withContext with the history-snapshot label and taskInstance.id', async () => {
    const withContextSpy = vi.fn(<T>(_ctx: unknown, fn: () => T) => fn());
    const core = {
      getStartServices: vi
        .fn()
        .mockResolvedValue([{ executionContext: { withContext: withContextSpy } }]),
    } as unknown as EntityStoreCoreSetup;
    const registerTaskDefinitions = vi.fn();
    const taskManager = { registerTaskDefinitions } as unknown as TaskManagerSetupContract;
    const logger = loggerMock.create();
    (logger.get as Mock) = vi.fn().mockReturnValue(logger);

    registerHistorySnapshotTask({ taskManager, logger, core });

    const [defs] = registerTaskDefinitions.mock.calls[0];
    const [taskType] = Object.keys(defs);
    const runner = defs[taskType].createTaskRunner({
      taskInstance: { id: 'history-snapshot:default', state: { namespace: 'default' } },
      signal: new AbortController().signal,
    });

    await runner.run();

    expect(withContextSpy).toHaveBeenCalledWith(
      buildEaExecutionContext(
        EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_HISTORY_SNAPSHOT_TASK,
        'history-snapshot:default'
      ),
      expect.any(Function)
    );
  });
});
