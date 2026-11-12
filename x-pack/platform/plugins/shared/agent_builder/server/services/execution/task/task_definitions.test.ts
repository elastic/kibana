/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { registerTaskDefinitions, taskTypes, wakeParentTaskId } from './task_definitions';
import type { TaskHandler } from './task_handler';

describe('wake-parent task definition', () => {
  const wakeParent = jest.fn();
  let definitions: Parameters<TaskManagerSetupContract['registerTaskDefinitions']>[0];

  registerTaskDefinitions({
    taskManager: {
      registerTaskDefinitions: (defs: typeof definitions) => {
        definitions = defs;
      },
    } as unknown as TaskManagerSetupContract,
    getTaskHandler: () => ({ wakeParent } as unknown as TaskHandler),
    getStartServices: jest.fn(),
  });

  const { signal } = new AbortController();

  const createRunner = (fakeRequest?: ReturnType<typeof httpServerMock.createKibanaRequest>) =>
    definitions[taskTypes.wakeParent].createTaskRunner({
      taskInstance: {
        id: wakeParentTaskId('child-1'),
        params: { childExecutionId: 'child-1' },
      },
      fakeRequest,
      signal,
    } as never);

  it('runs the wake under the task request and signal, again later while there is nothing to do yet', async () => {
    expect(() => createRunner()).toThrow('missing API key');

    const runner = createRunner(httpServerMock.createKibanaRequest());

    wakeParent.mockResolvedValueOnce({ done: false });
    await expect(runner.run()).resolves.toEqual({ state: {}, runAt: expect.any(Date) });

    wakeParent.mockResolvedValueOnce({ done: true });
    await expect(runner.run()).resolves.toEqual({ state: {} });
    expect(wakeParent).toHaveBeenCalledWith({
      childExecutionId: 'child-1',
      fakeRequest: expect.anything(),
      signal,
    });
  });
});
