/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinition, TaskPriority } from '../../task';
import { setupKibanaSetupOnly } from '../lib';
import type { TaskTypeDictionary } from '../../task_type_dictionary';

jest.mock('../../task_type_dictionary', () => {
  const actual = jest.requireActual('../../task_type_dictionary');
  return {
    ...actual,
    TaskTypeDictionary: jest.fn().mockImplementation((opts) => {
      return new actual.TaskTypeDictionary(opts);
    }),
  };
});

// Notify response-ops if a task sets a priority to something other than `Standard`
describe('Task priority checks', () => {
  let kibanaServer: Awaited<ReturnType<typeof setupKibanaSetupOnly>>['kibanaServer'];
  let taskTypeDictionary: TaskTypeDictionary;

  beforeAll(async () => {
    const setupResult = await setupKibanaSetupOnly();
    kibanaServer = setupResult.kibanaServer;

    const mockedTaskTypeDictionary = jest.requireMock('../../task_type_dictionary');
    expect(mockedTaskTypeDictionary.TaskTypeDictionary).toHaveBeenCalledTimes(1);
    taskTypeDictionary = mockedTaskTypeDictionary.TaskTypeDictionary.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
  });

  it('detects tasks with priority definitions', () => {
    const taskTypes = taskTypeDictionary.getAllDefinitions();
    const taskTypesWithPriority = taskTypes
      .map((taskType: TaskDefinition) =>
        !!taskType.priority ? { taskType: taskType.type, priority: taskType.priority } : null
      )
      .filter((tt: { taskType: string; priority: TaskPriority } | null) => null != tt);

    expect(taskTypesWithPriority.length).toEqual(8);
    expect(taskTypesWithPriority).toMatchSnapshot();
  });
});
