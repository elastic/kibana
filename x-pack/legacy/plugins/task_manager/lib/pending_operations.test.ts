/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createPendingOperations } from './pending_operations';

describe('PendingOperations', () => {
  describe('trackOperationOn', () => {
    test('it should return a tracked a pending operation', () => {
      const subject = {};
      const op = Promise.resolve(true);

      const tracker = createPendingOperations();
      expect(tracker.pendingTasks).toEqual(0);
      expect(tracker.trackOperationOn(subject, op)).toEqual(op);
      expect(tracker.pendingTasks).toEqual(1);
    });
  });

  describe('untrack', () => {
    test('it should stop tracking a pending operation', () => {
      const subject = {};
      const op = Promise.resolve(true);

      const tracker = createPendingOperations();
      expect(tracker.trackOperationOn(subject, op)).toEqual(op);

      expect(tracker.pendingTasks).toEqual(1);
      tracker.untrack(subject);
      expect(tracker.pendingTasks).toEqual(0);
    });

    test('it should ignore a request to stop tracking an untracked subject', () => {
      const subject = {};

      const tracker = createPendingOperations();
      expect(tracker.pendingTasks).toEqual(0);
      tracker.untrack(subject);
      expect(tracker.pendingTasks).toEqual(0);
    });
  });

  describe('whenPendingTasksComplete', () => {
    test('it should resolve when all racked operations are untracked', done => {
      expect.assertions(3);
      const subject1 = {};
      const subject2 = {};
      const subject3 = {};

      const tracker = createPendingOperations();

      tracker.trackOperationOn(subject1, Promise.resolve(true));
      tracker.trackOperationOn(subject2, Promise.resolve(true));

      tracker.whenPendingTasksComplete().then(done);

      tracker.trackOperationOn(subject3, Promise.resolve(true));

      tracker.untrack(subject1);
      expect(tracker.pendingTasks).toEqual(2);
      tracker.untrack(subject2);
      expect(tracker.pendingTasks).toEqual(1);
      tracker.untrack(subject3);
      expect(tracker.pendingTasks).toEqual(0);
    });

    test('it should allow multiple registrations for completion', done => {
      const subject1 = {};
      const subject2 = {};

      const tracker = createPendingOperations();

      tracker.trackOperationOn(subject1, Promise.resolve(true));
      tracker.trackOperationOn(subject2, Promise.resolve(true));

      Promise.all([tracker.whenPendingTasksComplete(), tracker.whenPendingTasksComplete()]).then(
        () => done()
      );

      tracker.untrack(subject1);
      tracker.untrack(subject2);
    });
  });
});
