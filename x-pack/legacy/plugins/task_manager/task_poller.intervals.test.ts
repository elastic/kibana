/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';
import { TaskPoller } from './task_poller';
import { mockLogger, resolvable } from './test_utils';
import { fakeSchedulers } from 'rxjs-marbles/jest';

describe('TaskPoller Intervals', () => {
  beforeEach(() => jest.useFakeTimers());
  test(
    'runs the work function on an interval',
    fakeSchedulers(async advance => {
      jest.useFakeTimers();
      const pollInterval = _.random(10, 20);
      const done = resolvable();
      const work = jest.fn(async () => {
        done.resolve();
        return true;
      });
      const poller = new TaskPoller<boolean, void>({
        pollInterval,
        work,
        logger: mockLogger(),
      });
      poller.start();
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);
      await done;
      advance(pollInterval - 1);
      expect(work).toHaveBeenCalledTimes(1);
      advance(1);
      expect(work).toHaveBeenCalledTimes(2);
    })
  );
});
