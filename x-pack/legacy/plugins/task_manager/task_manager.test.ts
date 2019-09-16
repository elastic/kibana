/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { TaskManager } from './task_manager';
import { SavedObjectsClientMock } from 'src/core/server/mocks';
import { SavedObjectsSerializer, SavedObjectsSchema } from 'src/core/server';
import { mockLogger } from './test_utils';

const savedObjectsClient = SavedObjectsClientMock.create();
const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());

describe('TaskManager', () => {
  let clock: sinon.SinonFakeTimers;
  const defaultConfig = {
    xpack: {
      task_manager: {
        max_workers: 10,
        override_num_workers: {},
        index: 'foo',
        max_attempts: 9,
        poll_interval: 6000000,
      },
    },
  };
  const config = {
    get: (path: string) => _.get(defaultConfig, path),
  };
  const taskManagerOpts = {
    config,
    savedObjectsRepository: savedObjectsClient,
    serializer,
    callWithInternalUser: jest.fn(),
    logger: mockLogger(),
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('allows and queues scheduling tasks before starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'task',
      attributes: {},
      references: [],
    });
    const promise = client.schedule(task);
    client.start();
    await promise;
    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  test('allows scheduling tasks after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    client.start();
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'task',
      attributes: {},
      references: [],
    });
    await client.schedule(task);
    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  test('allows and queues removing tasks before starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    savedObjectsClient.delete.mockResolvedValueOnce({});
    const promise = client.remove('1');
    client.start();
    await promise;
    expect(savedObjectsClient.delete).toHaveBeenCalled();
  });

  test('allows removing tasks after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.start();
    savedObjectsClient.delete.mockResolvedValueOnce({});
    await client.remove('1');
    expect(savedObjectsClient.delete).toHaveBeenCalled();
  });

  test('allows and queues fetching tasks before starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    taskManagerOpts.callWithInternalUser.mockResolvedValue({
      hits: {
        total: {
          value: 0,
        },
        hits: [],
      },
    });
    const promise = client.fetch({});
    client.start();
    await promise;
    expect(taskManagerOpts.callWithInternalUser).toHaveBeenCalled();
  });

  test('allows fetching tasks after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.start();
    taskManagerOpts.callWithInternalUser.mockResolvedValue({
      hits: {
        total: {
          value: 0,
        },
        hits: [],
      },
    });
    await client.fetch({});
    expect(taskManagerOpts.callWithInternalUser).toHaveBeenCalled();
  });

  test('allows middleware registration before starting', () => {
    const client = new TaskManager(taskManagerOpts);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };
    expect(() => client.addMiddleware(middleware)).not.toThrow();
  });

  test('disallows middleware registration after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };

    client.start();

    expect(() => client.addMiddleware(middleware)).toThrow(
      /Cannot add middleware after the task manager is initialized/i
    );
  });
});
