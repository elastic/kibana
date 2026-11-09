/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyRunNowNextRunAt, setRunNowNextRunAt } from './run_now_next_run';

describe('Run now next run', () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);

  it('saves the pending occurrence in the task state', () => {
    expect(setRunNowNextRunAt({ other: 1 }, future)).toEqual({
      other: 1,
      runNowNextRunAt: future.toISOString(),
    });
  });

  it('leaves the result alone when Run now saved nothing', () => {
    expect(applyRunNowNextRunAt({}, undefined)).toBeUndefined();
    expect(applyRunNowNextRunAt({ other: 1 }, { state: { other: 2 } })).toEqual({
      state: { other: 2 },
    });
  });

  it('hands the saved occurrence back and clears it from the state', () => {
    const state = setRunNowNextRunAt({ other: 1 }, future);

    expect(applyRunNowNextRunAt(state, undefined)).toEqual({
      state: { other: 1 },
      runAt: future,
    });
  });

  it('lets Task Manager pick the next run when the saved occurrence has passed', () => {
    const state = setRunNowNextRunAt({}, past);

    expect(applyRunNowNextRunAt(state, undefined)).toEqual({ state: {} });
  });

  it('keeps a next run the runner chose itself', () => {
    const retryAt = new Date(Date.now() + 10_000);
    const state = setRunNowNextRunAt({}, future);

    expect(applyRunNowNextRunAt(state, { state: { waitingSince: 1 }, runAt: retryAt })).toEqual({
      state: { waitingSince: 1 },
      runAt: retryAt,
    });
  });
});
