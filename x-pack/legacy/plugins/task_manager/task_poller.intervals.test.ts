/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { interval } from 'rxjs';
import { TaskPoller } from './task_poller';
import { mockLogger } from './test_utils';

jest.mock('rxjs', () => ({
  Subject: jest.fn(() => ({
    pipe: jest.fn(() => ({
      pipe: jest.fn(),
      subscribe: jest.fn(),
    })),
  })),
  Subscription: jest.fn(),
  Observable: jest.fn(() => ({
    pipe: jest.fn(),
  })),
  interval: jest.fn(() => ({
    pipe: jest.fn(),
  })),
}));

describe('TaskPoller Intervals', () => {
  test('intializes with the provided interval', () => {
    const pollInterval = _.random(10, 20);

    new TaskPoller<void, void>({
      pollInterval,
      work: async () => {},
      logger: mockLogger(),
    });

    expect(interval).toHaveBeenCalledWith(pollInterval);
  });
});
