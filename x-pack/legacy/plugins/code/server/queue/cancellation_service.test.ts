/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancellationToken } from '../lib/esqueue';

import sinon from 'sinon';

import { CancellationReason, CancellationSerivce } from './cancellation_service';

afterEach(() => {
  sinon.restore();
});

test('Register and cancel cancellation token', async () => {
  const repoUri = 'github.com/elastic/code';
  const service = new CancellationSerivce();
  const token = {
    cancel: (): void => {
      return;
    },
  };
  const cancelSpy = sinon.spy();
  token.cancel = cancelSpy;

  // create a promise and defer its fulfillment
  let promiseResolve: () => void = () => {};
  const promise = new Promise(resolve => {
    promiseResolve = resolve;
  });
  await service.registerCancelableIndexJob(repoUri, (token as any) as CancellationToken, promise);
  // do not wait on the promise, or there will be a dead lock
  const cancelPromise = service.cancelIndexJob(repoUri, CancellationReason.NEW_JOB_OVERRIDEN);
  // resolve the promise now
  promiseResolve();

  await cancelPromise;

  expect(cancelSpy.calledOnce).toBeTruthy();
});

test('Register and cancel cancellation token while an exception is thrown from the job', async () => {
  const repoUri = 'github.com/elastic/code';
  const service = new CancellationSerivce();
  const token = {
    cancel: (): void => {
      return;
    },
  };
  const cancelSpy = sinon.spy();
  token.cancel = cancelSpy;

  // create a promise and defer its rejection
  let promiseReject: () => void = () => {};
  const promise = new Promise((resolve, reject) => {
    promiseReject = reject;
  });
  await service.registerCancelableIndexJob(repoUri, (token as any) as CancellationToken, promise);
  // expect no exceptions are thrown when cancelling the job
  // do not wait on the promise, or there will be a dead lock
  const cancelPromise = service.cancelIndexJob(repoUri, CancellationReason.NEW_JOB_OVERRIDEN);
  // reject the promise now
  promiseReject();

  await cancelPromise;

  expect(cancelSpy.calledOnce).toBeTruthy();
});
