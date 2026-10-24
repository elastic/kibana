/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { takeUntilAborted } from './take_until_aborted';

describe('takeUntilAborted', () => {
  it('passes values through when no signal is provided', () => {
    const source = new Subject<number>();
    const values: number[] = [];
    source.pipe(takeUntilAborted(undefined)).subscribe((v) => values.push(v));
    source.next(1);
    expect(values).toEqual([1]);
  });

  it('completes and unsubscribes from the source when the signal aborts', () => {
    const source = new Subject<number>();
    const controller = new AbortController();
    const complete = jest.fn();
    source.pipe(takeUntilAborted(controller.signal)).subscribe({ complete });

    expect(source.observed).toBe(true);
    controller.abort();
    expect(complete).toHaveBeenCalled();
    expect(source.observed).toBe(false);
  });

  it('completes without emitting when the signal is already aborted', () => {
    const source = new Subject<number>();
    const controller = new AbortController();
    controller.abort();
    const next = jest.fn();
    const complete = jest.fn();
    source.pipe(takeUntilAborted(controller.signal)).subscribe({ next, complete });

    source.next(1);
    expect(next).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalled();
  });
});
