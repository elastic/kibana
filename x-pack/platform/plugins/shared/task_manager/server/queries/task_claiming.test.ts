/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';
import { TaskClaiming } from './task_claiming';
import { taskStoreMock } from '../task_store.mock';
import apm from 'elastic-apm-node';
import { TaskPartitioner } from '../lib/task_partitioner';
import { KibanaDiscoveryService } from '../kibana_discovery_service';
import { DEFAULT_KIBANAS_PER_PARTITION } from '../config';

jest.mock('../constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: [
    'limitedToZero',
    'limitedToOne',
    'anotherLimitedToZero',
    'anotherLimitedToOne',
    'limitedToTwo',
    'limitedToFive',
  ],
}));

const taskManagerLogger = mockLogger();
const taskPartitioner = new TaskPartitioner({
  logger: taskManagerLogger,
  podName: 'test',
  kibanaDiscoveryService: {} as KibanaDiscoveryService,
  kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
});

beforeEach(() => jest.clearAllMocks());

const mockedDate = new Date('2019-02-12T21:01:22.479Z');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

const taskDefinitions = new TaskTypeDictionary(taskManagerLogger);
taskDefinitions.registerTaskDefinitions({
  report: {
    title: 'report',
    createTaskRunner: jest.fn(),
  },
  dernstraight: {
    title: 'dernstraight',
    createTaskRunner: jest.fn(),
  },
  yawn: {
    title: 'yawn',
    createTaskRunner: jest.fn(),
  },
});

const mockApmTrans = {
  end: jest.fn(),
};

describe('TaskClaiming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(apm, 'startTransaction')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => mockApmTrans as any);
  });

  test(`should log a warning when invalid strategy specified`, () => {
    const definitions = new TaskTypeDictionary(mockLogger());

    new TaskClaiming({
      logger: taskManagerLogger,
      strategy: 'non-default',
      definitions,
      excludedTaskTypes: [],
      taskStore: taskStoreMock.create({ taskManagerId: '' }),
      maxAttempts: 2,
      getAvailableCapacity: () => 10,
      taskPartitioner,
    });

    expect(taskManagerLogger.warn).toHaveBeenCalledWith(
      'Unknown task claiming strategy "non-default", falling back to update_by_query',
      { tags: ['taskClaiming'] }
    );
  });

  test(`should log when a certain task type is skipped due to having a zero concurency configuration`, () => {
    const definitions = new TaskTypeDictionary(mockLogger());
    definitions.registerTaskDefinitions({
      unlimited: {
        title: 'unlimited',
        createTaskRunner: jest.fn(),
      },
      anotherUnlimited: {
        title: 'anotherUnlimited',
        createTaskRunner: jest.fn(),
      },
      limitedToZero: {
        title: 'limitedToZero',
        maxConcurrency: 0,
        createTaskRunner: jest.fn(),
      },
      limitedToOne: {
        title: 'limitedToOne',
        maxConcurrency: 1,
        createTaskRunner: jest.fn(),
      },
      anotherLimitedToZero: {
        title: 'anotherLimitedToZero',
        maxConcurrency: 0,
        createTaskRunner: jest.fn(),
      },
      limitedToTwo: {
        title: 'limitedToTwo',
        maxConcurrency: 2,
        createTaskRunner: jest.fn(),
      },
    });

    new TaskClaiming({
      logger: taskManagerLogger,
      strategy: 'default',
      definitions,
      excludedTaskTypes: [],
      taskStore: taskStoreMock.create({ taskManagerId: '' }),
      maxAttempts: 2,
      getAvailableCapacity: () => 10,
      taskPartitioner,
    });

    expect(taskManagerLogger.info).toHaveBeenCalledTimes(2);
    expect(taskManagerLogger.info.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Task Manager will never claim tasks of the following types as their \\"maxConcurrency\\" is set to 0: limitedToZero, anotherLimitedToZero"`
    );
  });
});
