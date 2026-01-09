/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Observable } from 'rxjs';
import { toAsyncIterator } from './observable_to_generator';

describe('toAsyncIterator', () => {
  it('returns an async iterator emitting all the values from the source observable', async () => {
    const input = [1, 2, 3, 4, 5];
    const obs$ = of(...input);

    const output = [];
    const iterator = toAsyncIterator(obs$);
    for await (const event of iterator) {
      output.push(event);
    }

    expect(output).toEqual(input);
  });

  it('throws an error when the source observable throws', async () => {
    const obs$ = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);
      subscriber.error(new Error('something went wrong'));
    });

    const output: number[] = [];
    const iterator = toAsyncIterator(obs$);

    await expect(async () => {
      for await (const event of iterator) {
        output.push(event);
      }
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong"`);

    // Fail-fast behavior: queued values are discarded when error occurs
    expect(output).toEqual([]);
  });

  it('throws an error when the source observable errors while iterator is waiting', async () => {
    const obs$ = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);

      // Delay before erroring, so the iterator will be waiting for the next value
      setTimeout(() => {
        subscriber.error(new Error('delayed error'));
      }, 10);
    });

    const output: number[] = [];
    const iterator = toAsyncIterator(obs$);

    await expect(async () => {
      for await (const event of iterator) {
        output.push(event);
      }
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"delayed error"`);

    expect(output).toEqual([1, 2]);
  });
});
