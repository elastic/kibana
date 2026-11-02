/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCurrentTask,
  installCurrentTaskAccessor,
  runWithCurrentTask,
  uninstallCurrentTaskAccessor,
} from './current_task_context';
import { CURRENT_TASK_ACCESSOR, type CurrentTaskContext } from './types';

const ctx = (taskId: string): CurrentTaskContext => ({
  taskId,
  taskType: 'type',
  executionUuid: `uuid-${taskId}`,
});
const accessor = () =>
  (globalThis as Record<symbol, unknown>)[CURRENT_TASK_ACCESSOR] as
    | (() => CurrentTaskContext | null)
    | undefined;

describe('current task context', () => {
  afterEach(() => uninstallCurrentTaskAccessor());

  it('is undefined outside a run', () => {
    expect(getCurrentTask()).toBeUndefined();
  });

  it('survives awaits, timers and nested runs, and restores the outer task', async () => {
    await runWithCurrentTask(ctx('a'), async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(getCurrentTask()?.taskId).toBe('a');
      await runWithCurrentTask(ctx('b'), async () => {
        await new Promise((resolve) => setImmediate(resolve));
        expect(getCurrentTask()?.taskId).toBe('b');
      });
      expect(getCurrentTask()?.taskId).toBe('a');
    });
    expect(getCurrentTask()).toBeUndefined();
  });

  it('keeps interleaved runs apart', async () => {
    const seen: string[] = [];
    const run = (id: string, delay: number) =>
      runWithCurrentTask(ctx(id), async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        seen.push(`${id}:${getCurrentTask()?.taskId}`);
      });
    await Promise.all([run('a', 20), run('b', 5)]);
    expect(seen).toEqual(['b:b', 'a:a']);
  });

  describe('accessor', () => {
    it('is not installed by default', () => {
      expect(accessor()).toBeUndefined();
    });

    it('returns the current task, or null outside a run', () => {
      installCurrentTaskAccessor();
      expect(accessor()!()).toBeNull();
      runWithCurrentTask(ctx('a'), () => expect(accessor()!()).toEqual(ctx('a')));
    });

    it('is not enumerable, can be installed twice and is removed on uninstall', () => {
      installCurrentTaskAccessor();
      installCurrentTaskAccessor();
      expect(Object.getOwnPropertySymbols(globalThis)).toContain(CURRENT_TASK_ACCESSOR);
      expect(Object.getOwnPropertyDescriptor(globalThis, CURRENT_TASK_ACCESSOR)?.enumerable).toBe(
        false
      );
      uninstallCurrentTaskAccessor();
      expect(accessor()).toBeUndefined();
    });
  });
});
