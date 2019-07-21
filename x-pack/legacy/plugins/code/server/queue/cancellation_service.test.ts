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

  await service.registerCancelableIndexJob(
    repoUri,
    token as CancellationToken,
    Promise.resolve('resolved')
  );
  await service.cancelIndexJob(repoUri);

  expect(cancelSpy.calledOnce).toBeTruthy();
});
