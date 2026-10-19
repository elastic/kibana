/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { IsolatedTaskExecutor } from './isolated_task_executor';
import { IsolatedTaskTerminatedError } from './isolated_task_terminated_error';
import type { IsolatedTaskRequest } from './isolated_task_protocol';

jest.setTimeout(20000);

const request = (kind: 'cpu_spin' | 'infinite_loop', doseMs = 20): IsolatedTaskRequest => ({
  module: 'offender',
  params: { kind, doseMs },
});

const options = (executionId: string, killAfterMs = 10000) => ({
  executionId,
  signal: new AbortController().signal,
  killAfterMs,
});

const logger: Logger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  isLevelEnabled: jest.fn(() => true),
  get: jest.fn(() => logger),
};

describe('research isolated task class pools', () => {
  let executor: IsolatedTaskExecutor;

  beforeEach(() => {
    executor = new IsolatedTaskExecutor(2, logger);
  });

  afterEach(async () => {
    await executor.stop();
  });

  it('runs the real offender module off-main while a control timer progresses', async () => {
    let progressed = false;
    const timer = setTimeout(() => {
      progressed = true;
    }, 10);
    try {
      const result = await executor.run('offender', request('cpu_spin', 100), options('finite'));
      expect(result.threadId).toBeGreaterThan(0);
      expect(result.result.kind).toBe('cpu_spin');
      expect(result.result.blockedMs).toBeGreaterThanOrEqual(90);
      expect(result.heapUsed).toBeGreaterThan(0);
      expect(progressed).toBe(true);
    } finally {
      clearTimeout(timer);
    }
  });

  it('confirms termination of a genuinely infinite module and recreates a usable pool', async () => {
    await executor.run('offender', request('cpu_spin'), options('warm'));
    const failure = await executor
      .run('offender', request('infinite_loop'), options('runaway', 100))
      .catch((error: Error) => error);
    expect(failure).toBeInstanceOf(IsolatedTaskTerminatedError);
    if (!(failure instanceof IsolatedTaskTerminatedError)) throw new Error('Expected termination');
    expect(failure.reason).toBe('deadline');
    expect(failure.collateral).toBe(false);
    expect(failure.discardedRuns).toEqual(['runaway']);
    expect(executor.getInfo()).toEqual([]);
    const recovered = await executor.run('offender', request('cpu_spin'), options('recovered'));
    expect(recovered.result.kind).toBe('cpu_spin');
  });

  it('reports same-class collateral without killing another class pool', async () => {
    await Promise.all([
      executor.run('offender', request('cpu_spin'), options('warm-1')),
      executor.run('offender', request('cpu_spin'), options('warm-2')),
      executor.run('field_caps', request('cpu_spin'), options('warm-other')),
    ]);
    // These are protocol fixtures with class labels, not adoption of a field-caps task.
    const pending = Promise.allSettled([
      executor.run('offender', request('infinite_loop'), options('primary', 100)),
      executor.run('offender', request('infinite_loop'), options('collateral')),
      executor.run('field_caps', request('cpu_spin', 300), options('other-class')),
    ]);
    const [primary, collateral, other] = await pending;
    expect(primary.status).toBe('rejected');
    expect(collateral.status).toBe('rejected');
    expect(other.status).toBe('fulfilled');
    if (primary.status !== 'rejected' || collateral.status !== 'rejected') {
      throw new Error('Class termination did not reject both runs');
    }
    if (
      !(primary.reason instanceof IsolatedTaskTerminatedError) ||
      !(collateral.reason instanceof IsolatedTaskTerminatedError)
    ) {
      throw new Error('Expected typed termination outcomes');
    }
    expect(primary.reason.collateral).toBe(false);
    expect(primary.reason.discardedRuns).toEqual(['primary', 'collateral']);
    expect(collateral.reason.collateral).toBe(true);
    expect(executor.getInfo().map(({ workloadClass }) => workloadClass)).toEqual(['field_caps']);
  });

  it('honours the framework abort signal through hard pool destruction', async () => {
    await executor.run('offender', request('cpu_spin'), options('warm'));
    const controller = new AbortController();
    const result = executor
      .run('offender', request('infinite_loop'), {
        executionId: 'cancelled',
        signal: controller.signal,
      })
      .catch((error: Error) => error);
    const timer = setTimeout(() => controller.abort(), 50);
    try {
      const failure = await result;
      expect(failure).toBeInstanceOf(IsolatedTaskTerminatedError);
      if (!(failure instanceof IsolatedTaskTerminatedError))
        throw new Error('Expected cancellation');
      expect(failure.reason).toBe('cancelled');
      expect(executor.getInfo()).toEqual([]);
    } finally {
      clearTimeout(timer);
    }
  });

  it('does not admit work racing plugin shutdown', async () => {
    const pending = executor.run('offender', request('cpu_spin'), options('racing-stop'));
    const rejection = expect(pending).rejects.toThrow('stopping');
    await executor.stop();
    await rejection;
    await expect(executor.run('offender', request('cpu_spin'), options('late'))).rejects.toThrow(
      'stopping'
    );
  });
});
