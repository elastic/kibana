/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { asyncRetry } from './async_retry';

describe('asyncRetry', () => {
  test('wraps an async function and resolves when it resolves', async () => {
    async function performAsyncAction() {
      return true;
    }

    return expect(await asyncRetry(performAsyncAction)()).toEqual(true);
  });

  test('catches an error and tried again', async () => {
    let count = 0;
    async function performAsyncActionFailOnFirst() {
      if (++count === 1) {
        throw new Error('fail');
      }
      return true;
    }

    expect(await asyncRetry(performAsyncActionFailOnFirst)()).toEqual(true);
  });

  test('only retries once by default', async () => {
    let count = 0;
    async function performAsyncActionFailOnFirst() {
      if (++count < 3) {
        throw new Error('fail');
      }
      return true;
    }

    return expect(asyncRetry(performAsyncActionFailOnFirst)()).rejects.toMatchInlineSnapshot(
      `[Error: fail]`
    );
  });

  test('it takes a custom number of retries', async () => {
    let count = 0;
    async function performAsyncActionSucceedOnFifth() {
      if (++count < 5) {
        throw new Error('fail');
      }
      return true;
    }

    const retries = 4;

    return expect(
      await asyncRetry(
        performAsyncActionSucceedOnFifth,
        _.matchesProperty('message', 'fail'),
        retries
      )()
    ).toEqual(true);
  });

  test('it takes a custom retryOn function which returns when to retry', async () => {
    let count = 0;
    async function performAsyncActionFailOnFirst() {
      if (count++ < 2) {
        throw new Error('retry');
      }
      return true;
    }

    const retryOn = _.matchesProperty('message', 'retry');

    return expect(await asyncRetry(performAsyncActionFailOnFirst, retryOn, 2)()).toEqual(true);
  });

  test('it throws even if retryOn returns true when retries number has expired', async () => {
    async function performAsyncActionFailOnFirst() {
      throw new Error('retry');
    }

    const retryOn = _.matchesProperty('message', 'retry');

    return expect(
      asyncRetry(performAsyncActionFailOnFirst, retryOn, 2)()
    ).rejects.toMatchInlineSnapshot(`[Error: retry]`);
  });
});
