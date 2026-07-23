/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectStreamResults, createRulePipelineState } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { MetricCollectorImpl } from './metric_collector';
import { MetricsMiddleware } from './metrics_middleware';
import type { MetricRecorder } from './types';
import type { RuleExecutionStep, StepStreamResult } from '../types';
import type { RuleExecutionMiddlewareContext } from '../middleware/types';

const createStep = (name: string): RuleExecutionStep => ({
  name,
  executeStream: jest.fn((input) => input),
});

const createContext = (
  step: RuleExecutionStep,
  collector?: RuleExecutionMiddlewareContext['collector']
): RuleExecutionMiddlewareContext => ({ step, collector });

const createEmittingStream = (emissions: StepStreamResult[]) =>
  async function* () {
    for (const emission of emissions) {
      yield emission;
    }
  };

describe('MetricsMiddleware', () => {
  const state = createRulePipelineState();

  it('passes through unchanged when no recorders are bound', async () => {
    const { loggerService } = createLoggerService();
    const middleware = new MetricsMiddleware([], loggerService);
    const step = createStep('any');
    const collector = new MetricCollectorImpl({
      executionId: 'e',
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const output = middleware.execute(
      createContext(step, collector),
      (input) => input,
      createEmittingStream([{ type: 'continue', state }])()
    );

    const results = await collectStreamResults(output);
    expect(results).toEqual([{ type: 'continue', state }]);
  });

  it('passes through unchanged when the context has no collector', async () => {
    const { loggerService } = createLoggerService();
    const recorder: MetricRecorder = {
      name: 'r',
      observes: 'all',
      record: jest.fn(),
    };
    const middleware = new MetricsMiddleware([recorder], loggerService);
    const step = createStep('any');

    const output = middleware.execute(
      createContext(step),
      (input) => input,
      createEmittingStream([{ type: 'continue', state }])()
    );

    await collectStreamResults(output);
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('invokes recorders that observe all steps for every continue emission', async () => {
    const { loggerService } = createLoggerService();
    const record = jest.fn();
    const recorder: MetricRecorder = { name: 'all', observes: 'all', record };
    const middleware = new MetricsMiddleware([recorder], loggerService);
    const step = createStep('step1');
    const collector = new MetricCollectorImpl({
      executionId: 'e',
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const meta = { counters: { signalsGenerated: 3 } };

    const output = middleware.execute(
      createContext(step, collector),
      (input) => input,
      createEmittingStream([
        { type: 'continue', state, meta },
        { type: 'continue', state },
      ])()
    );

    await collectStreamResults(output);

    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenNthCalledWith(1, collector, {
      state,
      meta,
      stepName: 'step1',
      emissionIndex: 0,
    });
    expect(record).toHaveBeenNthCalledWith(2, collector, {
      state,
      meta: undefined,
      stepName: 'step1',
      emissionIndex: 1,
    });
  });

  it('filters recorders by step name when observes is scoped', async () => {
    const { loggerService } = createLoggerService();
    const recordMatching = jest.fn();
    const recordOther = jest.fn();
    const middleware = new MetricsMiddleware(
      [
        { name: 'match', observes: { stepName: 'step1' }, record: recordMatching },
        { name: 'other', observes: { stepName: 'step2' }, record: recordOther },
      ],
      loggerService
    );
    const step = createStep('step1');
    const collector = new MetricCollectorImpl({
      executionId: 'e',
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const output = middleware.execute(
      createContext(step, collector),
      (input) => input,
      createEmittingStream([{ type: 'continue', state }])()
    );

    await collectStreamResults(output);
    expect(recordMatching).toHaveBeenCalledTimes(1);
    expect(recordOther).not.toHaveBeenCalled();
  });

  it('does not invoke recorders on halt emissions', async () => {
    const { loggerService } = createLoggerService();
    const record = jest.fn();
    const middleware = new MetricsMiddleware(
      [{ name: 'all', observes: 'all', record }],
      loggerService
    );
    const step = createStep('step1');
    const collector = new MetricCollectorImpl({
      executionId: 'e',
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const output = middleware.execute(
      createContext(step, collector),
      (input) => input,
      createEmittingStream([{ type: 'halt', reason: 'rule_deleted', state }])()
    );

    await collectStreamResults(output);
    expect(record).not.toHaveBeenCalled();
  });

  it('isolates recorder failures with a warn log and continues iterating', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const failing: MetricRecorder = {
      name: 'boom',
      observes: 'all',
      record: () => {
        throw new Error('recorder failure');
      },
    };
    const ok = jest.fn();
    const middleware = new MetricsMiddleware(
      [failing, { name: 'ok', observes: 'all', record: ok }],
      loggerService
    );
    const step = createStep('step1');
    const collector = new MetricCollectorImpl({
      executionId: 'e',
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const output = middleware.execute(
      createContext(step, collector),
      (input) => input,
      createEmittingStream([{ type: 'continue', state }])()
    );

    const results = await collectStreamResults(output);
    expect(results).toEqual([{ type: 'continue', state }]);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('recorder "boom" failed at step "step1"')
    );
  });
});
