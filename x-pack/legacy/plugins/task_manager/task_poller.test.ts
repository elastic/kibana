/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { TaskPoller } from './task_poller';
import { mockLogger, resolvable, sleep } from './test_utils';

describe('TaskPoller', () => {
  describe('lifecycle', () => {
    test('logs, but does not crash if the work function fails', async done => {
      const logger = mockLogger();

      let count = 0;
      const work = jest.fn(async () => {
        ++count;
        if (count === 1) {
          throw new Error('Dang it!');
        } else if (count > 1) {
          poller.stop();

          expect(work).toHaveBeenCalledTimes(2);
          expect(logger.error.mock.calls[0][0]).toMatchInlineSnapshot(
            `"Failed to poll for work: Error: Dang it!"`
          );

          done();
        }
      });

      const poller = new TaskPoller<void, void>({
        logger,
        pollInterval: 1,
        work,
      });

      poller.start();
    });

    test('is stoppable', async () => {
      const doneWorking = resolvable();
      const work = jest.fn(async () => {
        poller.stop();
        doneWorking.resolve();
      });

      const poller = new TaskPoller<void, void>({
        logger: mockLogger(),
        pollInterval: 1,
        work,
      });

      poller.start();
      await doneWorking;
      expect(work).toHaveBeenCalledTimes(1);
      await sleep(100);
      expect(work).toHaveBeenCalledTimes(1);
    });

    test('disregards duplicate calls to "start"', async () => {
      const doneWorking = resolvable();
      const work = jest.fn(async () => {
        await doneWorking;
      });
      const poller = new TaskPoller<void, void>({
        pollInterval: 1,
        logger: mockLogger(),
        work,
      });

      poller.start();
      await sleep(10);
      poller.start();
      poller.start();
      await sleep(10);
      poller.start();
      await sleep(10);

      poller.stop();

      doneWorking.resolve();

      await sleep(10);

      expect(work).toHaveBeenCalledTimes(1);
    });

    test('waits for work before polling', async () => {
      const doneWorking = resolvable();
      const work = jest.fn(async () => {
        await sleep(10);
        poller.stop();
        doneWorking.resolve();
      });
      const poller = new TaskPoller<void, void>({
        pollInterval: 1,
        logger: mockLogger(),
        work,
      });

      poller.start();
      await doneWorking;

      expect(work).toHaveBeenCalledTimes(1);
    });

    test('queues claim requests while working', async done => {
      let count = 0;

      const poller = new TaskPoller<void, string>({
        pollInterval: 1,
        logger: mockLogger(),
        work: jest.fn(async (first, second) => {
          count++;
          if (count === 1) {
            poller.queueWork('asd');
            poller.queueWork('123');
          } else if (count === 2) {
            expect(first).toEqual('asd');
            expect(second).toEqual('123');

            done();
          } else {
            poller.stop();
          }
        }),
      });

      poller.start();
    });
  });
});
