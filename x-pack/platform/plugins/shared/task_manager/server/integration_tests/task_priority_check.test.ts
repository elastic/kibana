/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { TaskDefinition, TaskPriority } from '../task';
import { setupTestServers } from './lib';
import { TaskTypeDictionary } from '../task_type_dictionary';

jest.mock('../task_type_dictionary', () => {
  const actual = jest.requireActual('../task_type_dictionary');
  return {
    ...actual,
    TaskTypeDictionary: jest.fn().mockImplementation((opts) => {
      return new actual.TaskTypeDictionary(opts);
    }),
  };
});

// Notify response-ops if a task sets a priority to something other than `Normal`
describe('Task priority checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskTypeDictionary: TaskTypeDictionary;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedTaskTypeDictionary = jest.requireMock('../task_type_dictionary');
    expect(mockedTaskTypeDictionary.TaskTypeDictionary).toHaveBeenCalledTimes(1);
    taskTypeDictionary = mockedTaskTypeDictionary.TaskTypeDictionary.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('detects tasks with priority definitions', async () => {
    const taskTypes = taskTypeDictionary.getAllDefinitions();
    const taskTypesWithPriority = taskTypes
      .map((taskType: TaskDefinition) =>
        !!taskType.priority ? { taskType: taskType.type, priority: taskType.priority } : null
      )
      .filter((tt: { taskType: string; priority: TaskPriority } | null) => null != tt);
    expect(taskTypesWithPriority).toMatchSnapshot();
  });
});
