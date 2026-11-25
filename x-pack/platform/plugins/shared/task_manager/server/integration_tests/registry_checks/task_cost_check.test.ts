/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinition } from '../../task';
import { TaskCost } from '../../task';
import { setupKibanaSetupOnly } from '../lib';
import type { TaskTypeDictionary } from '../../task_type_dictionary';
import { sortBy } from 'lodash';
import { connectorsSpecs } from '@kbn/connector-specs';

jest.mock('../../task_type_dictionary', () => {
  const actual = jest.requireActual('../../task_type_dictionary');
  return {
    ...actual,
    TaskTypeDictionary: jest.fn().mockImplementation((opts) => {
      return new actual.TaskTypeDictionary(opts);
    }),
  };
});

const taskTypeIdsFromSpecs = new Set(
  Object.values(connectorsSpecs).map(({ metadata }) => `actions:${metadata.id}`)
);

// Notify response-ops if a task sets a cost to something other than `Normal`
describe('Task cost checks', () => {
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

  it('detects tasks with cost definitions', async () => {
    const taskTypes = taskTypeDictionary
      .getAllDefinitions()
      // Skip review of task types from connector specs
      .filter((taskType: TaskDefinition) => !taskTypeIdsFromSpecs.has(taskType.type));

    const taskTypesWithCost = sortBy(
      taskTypes
        .map((taskType: TaskDefinition) =>
          !!taskType.cost ? { taskType: taskType.type, cost: taskType.cost } : null
        )
        .filter(
          (tt: { taskType: string; cost: TaskCost } | null) =>
            null != tt && tt.cost !== TaskCost.Normal
        ),
      'taskType'
    );
    expect(taskTypesWithCost).toMatchSnapshot();
  });
});
