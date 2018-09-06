/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Cancellable } from './cancellable';

describe('Cancellable', () => {
  test('runs functions in sequence, passing results through', async () => {
    const result = await new Cancellable()
      .then(() => Promise.resolve('Howdy'))
      .then(msg => Promise.resolve(msg + '!!!'));

    expect(result).toEqual('Howdy!!!');
  });

  test('exits if a promise rejects', async () => {
    let called = false;
    try {
      await new Cancellable()
        .then(() => {
          throw new Error('DOH!');
        })
        .then(() => (called = true));
      called = true;
    } catch (err) {
      expect(err.message).toMatch(/DOH/);
    }

    expect(called).toBeFalsy();
  });

  test('allows normal catch semantics', async () => {
    const result = await new Cancellable()
      .then(() => {
        throw new Error('DOH!');
      })
      .catch(() => 'Hello')
      .then(s => s + ' World!');
    expect(result).toEqual('Hello World!');
  });

  test('bypasses catch and thens if cancelled', async () => {
    let cancelPromise;
    const calls: string[] = [];

    const result = new Cancellable()
      .then(() => {
        cancelPromise = result.cancel();
      })
      .then(() => calls.push('a'))
      .catch(() => calls.push('b'))
      .then(() => calls.push('c'));

    try {
      await result;
    } catch (err) {
      await cancelPromise;
      expect(err.status).toEqual('cancelled');
    }

    expect(calls).toEqual([]);
  });

  test('exits if canceled', async () => {
    let count = 0;
    try {
      const promise = new Cancellable()
        .then(() => Promise.resolve(++count))
        .then(() => Promise.resolve(++count))
        .then(() => Promise.resolve(++count));
      await promise.cancel();
      const result = await promise;
      throw new Error(`SHOULD HAVE REJECTED, but resolved to ${JSON.stringify(result)}`);
    } catch (err) {
      expect(err.message).toMatch(/Promise cancelled/);
      expect(err.status).toEqual('cancelled');
      expect(count).toBeLessThan(3);
    }
  });

  test('calls cancelled handlers', async () => {
    let count = 0;
    let cancelled = 0;
    try {
      const promise = new Cancellable()
        .then(() => Promise.resolve(++count))
        .cancelled(() => ++cancelled)
        .then(() => Promise.resolve(++count))
        .then(() => Promise.resolve(++count))
        .cancelled(() => ++cancelled);
      await promise.cancel();
      const result = await promise;
      throw new Error(`SHOULD HAVE REJECTED, but resolved to ${JSON.stringify(result)}`);
    } catch (err) {
      expect(err.status).toEqual('cancelled');
      expect(cancelled).toEqual(2);
      expect(count).toBeLessThan(3);
    }
  });

  test('waits for cancellation', async () => {
    let cancelled = 0;
    let count = 0;
    try {
      const promise = new Cancellable()
        .then(() => ++count)
        .cancelled(() => new Promise(resolve => setTimeout(() => resolve(++cancelled), 1)))
        .then(() => ++count)
        .cancelled(() => expect(++cancelled).toEqual(2));
      await promise.cancel();
      const result = await promise;
      throw new Error(`SHOULD HAVE REJECTED, but resolved to ${JSON.stringify(result)}`);
    } catch (err) {
      expect(err.status).toEqual('cancelled');
      expect(cancelled).toEqual(2);
      expect(count).toBeLessThan(2);
    }
  });

  test('supports nested cancellables', async () => {
    let count = 0;
    let cancelled = 0;

    try {
      const promise = new Cancellable()
        .then(() => {
          return new Cancellable()
            .then(() => {
              promise.cancel();
            })
            .cancelled(() => ++cancelled)
            .then(() => ++count);
        })
        .cancelled(() => ++cancelled);
      await promise;
    } catch (err) {
      expect(err.status).toEqual('cancelled');
      expect(cancelled).toEqual(2);
    }
  });

  test('duplicate calls to cancel are ignored', async () => {
    let cancelled = 0;

    try {
      const promise = new Cancellable().cancelled(() => ++cancelled);
      promise.cancel();
      promise.cancel();
      promise.cancel();
      await promise;
    } catch (err) {
      expect(err).toBeTruthy();
    }

    expect(cancelled).toEqual(1);
  });
});
