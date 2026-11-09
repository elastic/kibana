/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, lastValueFrom, of, throwError, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ChatEventType, type RoundInterruptedEvent } from '@kbn/agent-builder-common';
import { emitRoundInterruptedOnError } from './emit_round_interrupted_on_error';

const interrupted: RoundInterruptedEvent = {
  type: ChatEventType.roundInterrupted,
  data: {
    round_id: 'r1',
    started_at: '2026-01-01T00:00:00.000Z',
    input: { message: 'hi' },
    steps: [],
    summary: { time_to_last_token: 1 },
    attachments: [],
  },
};

describe('emitRoundInterruptedOnError', () => {
  it('passes events through untouched and completes when the source completes', async () => {
    const buildEvent = jest.fn(() => interrupted);
    const logger = loggingSystemMock.createLogger();

    const seen = await lastValueFrom(
      of(1, 2).pipe(emitRoundInterruptedOnError({ buildEvent, logger }), toArray())
    );

    expect(seen).toEqual([1, 2]);
    expect(buildEvent).not.toHaveBeenCalled();
  });

  it('emits the built event after the source events, then re-throws the same error', async () => {
    const failure = new Error('boom');
    const source$ = concat(
      of(1),
      throwError(() => failure)
    );
    const seen: unknown[] = [];
    let thrown: unknown;
    source$
      .pipe(
        emitRoundInterruptedOnError({
          buildEvent: () => interrupted,
          logger: loggingSystemMock.createLogger(),
        })
      )
      .subscribe({
        next: (value) => seen.push(value),
        error: (err) => {
          thrown = err;
        },
      });

    expect(seen).toEqual([1, interrupted]);
    expect(thrown).toBe(failure);
  });

  it('builds the event only when the source errors, at that moment', async () => {
    const buildEvent = jest.fn(() => interrupted);
    const source$ = concat(
      of(1),
      throwError(() => new Error('boom'))
    );
    source$
      .pipe(emitRoundInterruptedOnError({ buildEvent, logger: loggingSystemMock.createLogger() }))
      .subscribe({ error: () => {} });

    expect(buildEvent).toHaveBeenCalledTimes(1);
  });

  it('re-throws the original error alone and warns when building the event fails', async () => {
    const failure = new Error('boom');
    const logger = loggingSystemMock.createLogger();
    const seen: unknown[] = [];
    let thrown: unknown;
    throwError(() => failure)
      .pipe(
        emitRoundInterruptedOnError({
          buildEvent: () => {
            throw new Error('state manager broken');
          },
          logger,
        })
      )
      .subscribe({
        next: (value) => seen.push(value),
        error: (err) => {
          thrown = err;
        },
      });

    expect(seen).toEqual([]);
    expect(thrown).toBe(failure);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to build round_interrupted summary: state manager broken')
    );
  });
});
