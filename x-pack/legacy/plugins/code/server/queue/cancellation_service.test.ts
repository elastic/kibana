/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancellationToken } from '../lib/esqueue';

import sinon from 'sinon';

import { CancellationSerivce } from './cancellation_service';

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

  // make sure the promise won't be fulfilled immediately
  const promise = new Promise(resolve => {
    setTimeout(resolve, 100);
  });
  await service.registerCancelableIndexJob(repoUri, token as CancellationToken, promise);
  await service.cancelIndexJob(repoUri);

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

  // make sure the promise won't be fulfilled immediately
  const promise = new Promise((resolve, reject) => {
    setTimeout(reject, 100);
  });
  await service.registerCancelableIndexJob(repoUri, token as CancellationToken, promise);
  // expect no exceptions are thrown when cancelling the job
  await service.cancelIndexJob(repoUri);

  expect(cancelSpy.calledOnce).toBeTruthy();
});
