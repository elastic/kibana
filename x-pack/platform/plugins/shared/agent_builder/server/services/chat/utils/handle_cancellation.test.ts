/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject, toArray, firstValueFrom } from 'rxjs';
import { isAgentBuilderError, AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { handleCancellation } from './handle_cancellation';

describe('handleCancellation', () => {
  it('mirrors the source when the abort signal is not triggered', async () => {
    const abortController = new AbortController();

    const source$ = of(1, 2, 3);

    const output$ = source$.pipe(handleCancellation(abortController.signal));

    const events = await firstValueFrom(output$.pipe(toArray()));
    expect(events).toEqual([1, 2, 3]);
  });

  it('causes the observable to error when the signal fires', () => {
    const abortController = new AbortController();

    const source$ = new Subject<number>();

    const output$ = source$.pipe(handleCancellation(abortController.signal));

    let thrownError: any;
    const values: number[] = [];

    output$.subscribe({
      next: (value) => {
        values.push(value);
      },
      error: (err) => {
        thrownError = err;
      },
    });

    source$.next(1);
    source$.next(2);
    abortController.abort();
    source$.next(3);

    expect(values).toEqual([1, 2]);
    expect(isAgentBuilderError(thrownError)).toBe(true);
    expect(thrownError.code).toBe(AgentBuilderErrorCode.requestAborted);
    expect(thrownError.message).toContain('Converse request was aborted');
  });
});
