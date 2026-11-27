/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import type { RunContext } from './task';
import type { TaskHost } from './task_type_module';
import { defineTaskType, toTaskDefinition } from './task_type_module';

const host = (): TaskHost => ({
  logger: loggingSystemMock.createLogger(),
  elasticsearch: elasticsearchServiceMock.createStart().client,
  savedObjects: savedObjectsServiceMock.createStartContract(),
});

const context = {} as RunContext;

describe('toTaskDefinition', () => {
  it('drops module-only fields and keeps the definition', () => {
    const definition = toTaskDefinition(
      defineTaskType({
        type: 'test:one',
        title: 'One',
        timeout: '1m',
        savedObjectTypes: [],
        createTaskRunner: () => ({ run: async () => undefined }),
      }),
      async () => host()
    );
    expect(definition).toEqual({
      title: 'One',
      timeout: '1m',
      createTaskRunner: expect.any(Function),
    });
  });

  it('creates the module runner with the host on run', async () => {
    const resolved = host();
    const createTaskRunner = jest.fn().mockReturnValue({ run: async () => ({ state: { a: 1 } }) });
    const { createTaskRunner: create } = toTaskDefinition(
      defineTaskType({ type: 'test:one', createTaskRunner }),
      async () => resolved
    );
    expect(await create(context).run()).toEqual({ state: { a: 1 } });
    expect(createTaskRunner).toHaveBeenCalledWith(context, resolved);
  });

  it('cancels a run that was cancelled before the host resolved', async () => {
    const cancel = jest.fn();
    const run = jest.fn();
    const { createTaskRunner } = toTaskDefinition(
      defineTaskType({ type: 'test:one', createTaskRunner: () => ({ run, cancel }) }),
      async () => host()
    );
    const task = createTaskRunner(context);
    await task.cancel!();
    await task.run();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('forwards cancel and cleanup once the runner exists', async () => {
    const cancel = jest.fn();
    const cleanup = jest.fn();
    const { createTaskRunner } = toTaskDefinition(
      defineTaskType({
        type: 'test:one',
        createTaskRunner: () => ({ run: async () => undefined, cancel, cleanup }),
      }),
      async () => host()
    );
    const task = createTaskRunner(context);
    await task.run();
    await task.cancel!();
    await task.cleanup!();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
