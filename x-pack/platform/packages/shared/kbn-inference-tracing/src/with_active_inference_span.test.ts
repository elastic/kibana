/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { resources } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { WORKFLOW_RUN_ID_BAGGAGE_KEY } from './baggage';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
} from './inference_tracer_provider';
import { withActiveInferenceSpan } from './with_active_inference_span';

/**
 * Covers the baggage -> span-attribute half of the workflow-run-id bridge: the attribute is
 * read off the OTel baggage and stamped on every inference span created inside the call.
 * Without this, the join key never reaches the exported span no matter how the caller sets
 * the baggage.
 */
describe('withActiveInferenceSpan baggage -> attribute mapping', () => {
  const captured: tracing.ReadableSpan[] = [];
  let contextManager: AsyncHooksContextManager;

  beforeAll(() => {
    // `@opentelemetry/api` accepts exactly one global context manager, so it is registered
    // once here rather than per test.
    contextManager = new AsyncHooksContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterAll(() => {
    contextManager.disable();
  });

  beforeEach(() => {
    captured.length = 0;
    initInferenceTracerProvider({
      processors: [
        {
          onStart: () => undefined,
          onEnd: (span) => {
            captured.push(span);
          },
          forceFlush: async () => undefined,
          shutdown: async () => undefined,
        },
      ],
      resource: resources.resourceFromAttributes({}),
    });
  });

  afterEach(async () => {
    await shutdownInferenceTracerProvider();
  });

  it('stamps the workflow run id baggage onto the span as an attribute', () => {
    const baggage = propagation.createBaggage({
      [WORKFLOW_RUN_ID_BAGGAGE_KEY]: { value: 'wf-run-42' },
    });
    const ctx = propagation.setBaggage(context.active(), baggage);

    context.with(ctx, () => withActiveInferenceSpan('chat test-model', {}, () => undefined));

    expect(captured).toHaveLength(1);
    expect(captured[0].attributes[WORKFLOW_RUN_ID_BAGGAGE_KEY]).toBe('wf-run-42');
  });

  it('omits the attribute when the baggage entry is absent', () => {
    withActiveInferenceSpan('chat test-model', {}, () => undefined);

    expect(captured).toHaveLength(1);
    expect(captured[0].attributes[WORKFLOW_RUN_ID_BAGGAGE_KEY]).toBeUndefined();
  });
});
