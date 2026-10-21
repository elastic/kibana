/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Run-phase ensureScheduled through the island facade and WorkflowTaskManager.
 * Run: node .../server/t7w/resume_schedule_probe.cts */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  WorkflowTaskManager,
  getWorkflowImmediateResumeTaskId,
  getWorkflowWakeTaskId,
} from '@kbn/workflows-execution-engine/server/workflow_task_manager/workflow_task_manager';
import type { WorkerContext } from '../capability_kit/protocol';
import {
  createPlatformReplica,
  emptyPlatformReplicas,
  registerEnsureScheduledFence,
  resetEnsureScheduledFence,
  runInTmPhase,
} from '../capability_kit/worker_core';
import { reviveTaskManagerArgs } from '../t7a/request_codec';
import type { IslandSnapshot } from '../t7a/snapshot';
import { edgeStats, fenceStats, runContext } from '../t7a/isolate/bridge';
import { createDepFacades } from '../t7a/isolate/island';

const snapshot = {
  kibanaVersion: '9.6.0',
  buildFlavor: 'traditional',
  buildNum: 1,
  buildSha: 'test',
  instanceUuid: 'test',
  dist: false,
  dev: true,
  basePath: { serverBasePath: '' },
  license: { signature: 'test' },
  allIndices: [],
  defaultIndex: '',
  locatorIds: [],
  uiamEnabled: false,
  securityEnabled: true,
  useRbacForFakeRequest: false,
  taskManagerIndex: '.kibana_task_manager',
  rawConfig: {},
} as IslandSnapshot;

interface StoredTask {
  readonly id: string;
  readonly params: { workflowRunId?: string };
  readonly state: object;
}

interface StoredOptions {
  readonly cloneApiKey?: boolean;
  readonly request?: { headers: { authorization?: string } };
}

const facade = () => {
  const tasks = new Map<string, { task: StoredTask; options?: StoredOptions }>();
  const calls: string[] = [];
  const context = {
    signal: new AbortController().signal,
    async call(capability: string, operation: string, args: unknown) {
      calls.push(`${capability}.${operation}`);
      if (capability !== 'tm') return null;
      const revived = reviveTaskManagerArgs(operation, args);
      if (operation === 'ensureScheduled') {
        const task = revived[0] as StoredTask;
        tasks.set(task.id, { task, options: revived[1] as StoredOptions | undefined });
        return { id: task.id };
      }
      if (operation === 'runSoon') {
        const id = String(revived[0]);
        if (!tasks.has(id)) {
          return {
            __t7aError: { message: 'not found', statusCode: 404, soType: 'task', soId: id },
          };
        }
        return { id, forced: false };
      }
      return null;
    },
  } as unknown as WorkerContext;
  const { taskManagerStart } = createDepFacades(snapshot, createPlatformReplica(emptyPlatformReplicas()));
  return {
    tasks,
    calls,
    manager: new WorkflowTaskManager(taskManagerStart as never),
    context,
  };
};

const resume = {
  executionId: 'exec-1',
  spaceId: 'default',
  fakeRequest: kibanaRequestFactory({ headers: { authorization: 'ApiKey abc' } }),
};

void test('main and the island both create the resume tasks and accept the immediate wake', async () => {
  resetEnsureScheduledFence();
  fenceStats.clear();
  edgeStats.clear();
  const mainTasks = new Map<string, { params: { workflowRunId?: string }; state: object }>();
  const main = new WorkflowTaskManager({
    async ensureScheduled(task: { id: string; params: { workflowRunId?: string }; state: object }) {
      mainTasks.set(task.id, task);
      return { id: task.id };
    },
    async runSoon(id: string) {
      if (!mainTasks.has(id)) throw SavedObjectsErrorHelpers.createGenericNotFoundError('task', id);
      return { id, forced: false };
    },
  } as never);
  assert.equal(await main.tryRunImmediateResume(resume), true);
  await main.ensureWakeTask(resume);
  assert.equal(mainTasks.size, 2);
  assert.equal(mainTasks.get(getWorkflowImmediateResumeTaskId('exec-1'))?.params.workflowRunId, 'exec-1');
  assert.deepEqual(mainTasks.get(getWorkflowWakeTaskId('exec-1'))?.state, {});

  const island = facade();
  const accepted = await runContext.run(island.context, () =>
    runInTmPhase('run', async () => {
      const ok = await island.manager.tryRunImmediateResume(resume);
      await island.manager.ensureWakeTask(resume);
      return ok;
    })
  );
  assert.equal(accepted, true);
  assert.equal(island.tasks.size, 2);
  const immediate = island.tasks.get(getWorkflowImmediateResumeTaskId('exec-1'));
  assert.equal(immediate?.task.params.workflowRunId, 'exec-1');
  assert.deepEqual(immediate?.task.state, {});
  assert.equal(immediate?.options?.cloneApiKey, true);
  assert.equal(immediate?.options?.request?.headers.authorization, 'ApiKey abc');
  assert.equal(island.calls.filter((call) => call === 'tm.ensureScheduled').length, 2);
  assert.ok(island.calls.includes('tm.runSoon'));
});

void test('boot-phase ensureScheduled stays fenced and creates no host task', async () => {
  resetEnsureScheduledFence();
  fenceStats.clear();
  edgeStats.clear();
  const island = facade();
  await runContext.run(island.context, () =>
    runInTmPhase('boot', () => island.manager.tryRunImmediateResume(resume))
  );
  assert.equal(island.tasks.size, 0);
  assert.equal(island.calls.filter((call) => call === 'tm.ensureScheduled').length, 0);
  assert.ok((fenceStats.get('taskManager.ensureScheduled') ?? 0) >= 1);
});

void test('a class deny list fences run-phase ensureScheduled for that task type only', async () => {
  fenceStats.clear();
  edgeStats.clear();
  registerEnsureScheduledFence(['workflow:resume']);
  try {
    const island = facade();
    const accepted = await runContext.run(island.context, () =>
      runInTmPhase('run', () => island.manager.tryRunImmediateResume(resume))
    );
    assert.equal(accepted, false);
    assert.equal(island.tasks.size, 0);
    assert.equal(island.calls.filter((call) => call === 'tm.ensureScheduled').length, 0);
    assert.ok(island.calls.includes('tm.runSoon'));
    assert.ok((fenceStats.get('taskManager.ensureScheduled') ?? 0) >= 1);
  } finally {
    resetEnsureScheduledFence();
  }
});
