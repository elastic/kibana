/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStageError } from './stage_error';

describe('telemetry/stage_error', () => {
  it('extracts the error name and message', () => {
    expect(toStageError(new TypeError('boom'))).toEqual({
      type: 'TypeError',
      message: 'boom',
    });
  });

  it('falls back to "Error" when name is empty', () => {
    const err = new Error('no-name');
    Object.defineProperty(err, 'name', { value: '' });
    expect(toStageError(err)).toEqual({ type: 'Error', message: 'no-name' });
  });

  it('preserves the message verbatim (no stack or cause leakage)', () => {
    const err = new Error('hello', { cause: { secret: 'do-not-leak' } });
    err.stack = 'very long stack\nwith many frames';

    const out = toStageError(err);
    expect(out).toEqual({ type: 'Error', message: 'hello' });
    expect(Object.keys(out).sort()).toEqual(['message', 'type']);
  });

  it('uses the constructor-provided name for custom error subclasses', () => {
    class TimeoutError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'TimeoutError';
      }
    }
    expect(toStageError(new TimeoutError('slow'))).toEqual({
      type: 'TimeoutError',
      message: 'slow',
    });
  });
});
