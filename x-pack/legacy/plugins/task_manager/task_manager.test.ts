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
    task_manager: {
      max_workers: 10,
      override_num_workers: {},
      index: 'foo',
      max_attempts: 9,
      poll_interval: 6000000,
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

  test('disallows schedule before init', async () => {
    const client = new TaskManager(taskManagerOpts);
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    await expect(client.schedule(task)).rejects.toThrow(/^NotInitialized: .*/i);
  });

  test('disallows fetch before init', async () => {
    const client = new TaskManager(taskManagerOpts);
    await expect(client.fetch({})).rejects.toThrow(/^NotInitialized: .*/i);
  });

  test('disallows remove before init', async () => {
    const client = new TaskManager(taskManagerOpts);
    await expect(client.remove('23')).rejects.toThrow(/^NotInitialized: .*/i);
  });

  test('allows middleware registration before init', () => {
    const client = new TaskManager(taskManagerOpts);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };
    expect(() => client.addMiddleware(middleware)).not.toThrow();
  });

  test('disallows middleware registration after init', async () => {
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
