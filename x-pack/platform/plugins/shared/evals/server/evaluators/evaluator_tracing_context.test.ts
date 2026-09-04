/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context as otelContext, propagation } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { EVALUATOR_NAME_BAGGAGE_KEY } from '@kbn/inference-tracing';
import { withEvaluatorNameBaggage } from './evaluator_tracing_context';

describe('withEvaluatorNameBaggage', () => {
  let contextManager: AsyncLocalStorageContextManager;

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager();
    otelContext.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('sets the evaluator name baggage entry for the duration of fn', () => {
    let observedValue: string | undefined;

    withEvaluatorNameBaggage('groundedness', () => {
      const baggage = propagation.getBaggage(otelContext.active());
      observedValue = baggage?.getEntry(EVALUATOR_NAME_BAGGAGE_KEY)?.value as string | undefined;
    });

    expect(observedValue).toBe('groundedness');
  });

  it('does not leak the baggage entry outside of fn', () => {
    withEvaluatorNameBaggage('groundedness', () => {});

    const baggage = propagation.getBaggage(otelContext.active());
    expect(baggage?.getEntry(EVALUATOR_NAME_BAGGAGE_KEY)).toBeUndefined();
  });

  it('preserves pre-existing baggage entries set on the active context', () => {
    const preExistingBaggage = propagation
      .createBaggage()
      .setEntry('kibana.evals.execution_id', { value: 'exec-1' });
    const ctxWithBaggage = propagation.setBaggage(otelContext.active(), preExistingBaggage);

    let observed: { evaluatorName?: string; executionId?: string } = {};
    otelContext.with(ctxWithBaggage, () => {
      withEvaluatorNameBaggage('correctness', () => {
        const baggage = propagation.getBaggage(otelContext.active());
        observed = {
          evaluatorName: baggage?.getEntry(EVALUATOR_NAME_BAGGAGE_KEY)?.value as string | undefined,
          executionId: baggage?.getEntry('kibana.evals.execution_id')?.value as string | undefined,
        };
      });
    });

    expect(observed).toEqual({ evaluatorName: 'correctness', executionId: 'exec-1' });
  });

  it('returns the value produced by fn', async () => {
    const result = await withEvaluatorNameBaggage('latency', async () => 42);
    expect(result).toBe(42);
  });
});
