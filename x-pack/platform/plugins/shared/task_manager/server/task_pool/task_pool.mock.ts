/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TaskPool } from './task_pool';

const defaultGetCapacityOverride: () => Partial<{
  load: number;
  usedCapacity: number;
  usedCapacityPercentage: number;
  availableCapacity: number;
}> = () => ({
  load: 0,
  usedCapacity: 0,
  usedCapacityPercentage: 0,
  availableCapacity: 20,
});

const createTaskPoolMock = (getCapacityOverride = defaultGetCapacityOverride) => {
  return {
    get load() {
      return getCapacityOverride().load ?? 0;
    },
    get usedCapacity() {
      return getCapacityOverride().usedCapacity ?? 0;
    },
    get usedCapacityPercentage() {
      return getCapacityOverride().usedCapacityPercentage ?? 0;
    },
    availableCapacity() {
      return getCapacityOverride().availableCapacity ?? 20;
    },
    getUsedCapacityByType: jest.fn(),
    run: jest.fn(),
    cancelRunningTasks: jest.fn(),
  } as unknown as jest.Mocked<TaskPool>;
};

export const TaskPoolMock = {
  create: createTaskPoolMock,
};
