/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueueTimeoutError,
  RenderCapacityTimeoutError,
  RenderFailedError,
  RenderRequestRejectedError,
  RenderServiceSaturatedError,
  RenderServiceUnavailableError,
} from '@kbn/reporting-common';
import { decideRenderRetry, RESCHEDULE_DELAY_MS } from './render_retry';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const noJitter = () => 0.5;
const decide = (error: unknown, state = {}) => decideRenderRetry(error, state, NOW, noJitter);

describe('decideRenderRetry', () => {
  it('leaves errors that did not come from page-render-service to the usual handling', () => {
    expect(decide(new Error('boom'))).toBeUndefined();
    expect(decide(new QueueTimeoutError())).toBeUndefined();
  });

  it('hands a report waiting for capacity straight back, marking the next run as no new attempt', () => {
    const state = { renderFailures: { unavailable: 1 } };

    expect(decide(new RenderServiceSaturatedError(), state)).toEqual({
      action: 'hand_back',
      reason: 'saturated',
      runAt: new Date(NOW),
      state: { renderFailures: { unavailable: 1 }, waitingForCapacity: true },
    });
  });

  it('counts the run after a wait as a new attempt again', () => {
    const decision = decide(new RenderFailedError(), { waitingForCapacity: true });

    expect(decision).toMatchObject({ state: { renderFailures: { render_failure: 1 } } });
    expect((decision as { state: object }).state).not.toHaveProperty('waitingForCapacity');
  });

  it.each([
    ['an unreachable service', new RenderServiceUnavailableError(), 'unavailable', 4],
    ['a failed render', new RenderFailedError(), 'render_failure', 3],
  ])('reschedules %s, counting runs in the task state', (_name, error, failureClass, maxRuns) => {
    let state = {};
    for (let run = 1; run < maxRuns; run++) {
      const decision = decide(error, state);
      expect(decision).toEqual({
        action: 'reschedule',
        reason: failureClass,
        runAt: new Date(NOW + RESCHEDULE_DELAY_MS),
        state: { renderFailures: { [failureClass]: run } },
      });
      state = (decision as { state: object }).state;
    }

    expect(decide(error, state)).toEqual({ action: 'fail', reason: failureClass });
  });

  it('counts each kind of failure separately', () => {
    expect(decide(new RenderFailedError(), { renderFailures: { unavailable: 3 } })).toMatchObject({
      action: 'reschedule',
      state: { renderFailures: { unavailable: 3, render_failure: 1 } },
    });
  });

  it('fails a request the service rejected, without retrying', () => {
    expect(decide(new RenderRequestRejectedError())).toEqual({
      action: 'fail',
      reason: 'rejected',
    });
  });

  it('fails a report that waited out the capacity ceiling', () => {
    expect(decide(new RenderCapacityTimeoutError())).toEqual({
      action: 'fail',
      reason: 'saturated',
    });
  });

  it('spreads reschedules across ±50% of the delay', () => {
    const at = (random: number) =>
      (
        decideRenderRetry(new RenderFailedError(), {}, NOW, () => random) as { runAt: Date }
      ).runAt.getTime() - NOW;

    expect(at(0)).toBe(RESCHEDULE_DELAY_MS / 2);
    expect(at(0.999)).toBeLessThan(RESCHEDULE_DELAY_MS * 1.5);
  });
});
