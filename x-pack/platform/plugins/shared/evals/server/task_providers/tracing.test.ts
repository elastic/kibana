/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from '@kbn/inference-tracing';
import { withEvalsEvaluatorSpan, withEvalsTaskSpan } from './tracing';

describe('withEvalsTaskSpan', () => {
  let contextManager: AsyncHooksContextManager;

  beforeEach(() => {
    contextManager = new AsyncHooksContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
  });

  afterEach(() => {
    context.disable();
  });

  it('runs the task inside an inference context so gen_ai spans nest under the task trace', async () => {
    let beaconInsideTask: string | undefined;

    const result = await withEvalsTaskSpan('evals.test.task', async () => {
      beaconInsideTask = propagation
        .getBaggage(context.active())
        ?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value;
      return 'done';
    });

    // The inference "tracking beacon" must be present inside the task span. Without it,
    // the inference client's `createInferenceContext` treats itself as root and forks the
    // model's `gen_ai` span (which carries token usage) into a *separate* trace, so the
    // token/output evaluators — summing over the task's trace id — find nothing.
    expect(beaconInsideTask).toBe(BAGGAGE_TRACKING_BEACON_VALUE);
    expect(result).toBe('done');
  });

  it('propagates errors thrown by the task', async () => {
    await expect(
      withEvalsTaskSpan('evals.test.task', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });
});

describe('withEvalsEvaluatorSpan', () => {
  let contextManager: AsyncHooksContextManager;

  beforeEach(() => {
    contextManager = new AsyncHooksContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
  });

  afterEach(() => {
    context.disable();
  });

  it('runs the judge inside an inference context so its chat span nests under the judge trace', async () => {
    let beaconInsideJudge: string | undefined;

    const result = await withEvalsEvaluatorSpan('correctness', async () => {
      beaconInsideJudge = propagation
        .getBaggage(context.active())
        ?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value;
      return 'graded';
    });

    // Same rationale as the task span: without the beacon the judge's model call
    // forks into a separate `chat <model>` trace instead of nesting under the
    // named `judge · correctness` root.
    expect(beaconInsideJudge).toBe(BAGGAGE_TRACKING_BEACON_VALUE);
    expect(result).toBe('graded');
  });

  it('propagates errors thrown by the judge', async () => {
    await expect(
      withEvalsEvaluatorSpan('correctness', async () => {
        throw new Error('judge failed');
      })
    ).rejects.toThrow('judge failed');
  });
});
