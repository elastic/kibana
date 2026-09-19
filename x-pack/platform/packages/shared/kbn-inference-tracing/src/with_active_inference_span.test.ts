/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { core, resources } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { context, propagation } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
} from './inference_tracer_provider';
import { withActiveInferenceSpan } from './with_active_inference_span';
import { WORKFLOW_RUN_ID_ATTRIBUTE_NAME, withWorkflowRunIdContext } from './workflow_run_id';

/**
 * Covers the context -> span-attribute half of the workflow-run-id bridge: the attribute is read
 * off the active OTel context and stamped on every inference span created inside the call. Without
 * this, the join key never reaches the exported span no matter how the caller sets the context.
 */
describe('withActiveInferenceSpan workflow run id -> attribute mapping', () => {
  const captured: tracing.ReadableSpan[] = [];
  let contextManager: AsyncHooksContextManager;

  beforeAll(() => {
    // `@opentelemetry/api` accepts exactly one global context manager, so it is registered once
    // here rather than per test.
    contextManager = new AsyncHooksContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();

    // The same propagator Kibana installs in `initTracing`, so `propagation.inject` below behaves
    // like a real outbound connector/model-provider request.
    propagation.setGlobalPropagator(
      new core.CompositePropagator({
        propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
      })
    );
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

  it('stamps the workflow run id from the context onto the span as an attribute', () => {
    withWorkflowRunIdContext('wf-run-42', () =>
      withActiveInferenceSpan('chat test-model', {}, () => undefined)
    );

    expect(captured).toHaveLength(1);
    expect(captured[0].attributes[WORKFLOW_RUN_ID_ATTRIBUTE_NAME]).toBe('wf-run-42');
  });

  it('omits the attribute when no run id is in the context', () => {
    withActiveInferenceSpan('chat test-model', {}, () => undefined);

    expect(captured).toHaveLength(1);
    expect(captured[0].attributes[WORKFLOW_RUN_ID_ATTRIBUTE_NAME]).toBeUndefined();
  });

  it('does not propagate the run id outbound as W3C baggage', () => {
    const carrier: Record<string, string> = {};

    withWorkflowRunIdContext('wf-run-42', () => {
      withActiveInferenceSpan('chat test-model', {}, () => undefined);
      // What the http/undici instrumentations do for every outbound connector request made while
      // the run id is in scope.
      propagation.inject(context.active(), carrier);
    });

    // The join key is still stamped in-process...
    expect(captured[0].attributes[WORKFLOW_RUN_ID_ATTRIBUTE_NAME]).toBe('wf-run-42');
    // ...but it must not ride along to whatever the agent talks to: `includeRealIds: false`
    // anonymizes workflow ids, and the span processor cannot rewrite a header that has already
    // been sent.
    expect(carrier.baggage).toBeUndefined();
    expect(JSON.stringify(carrier)).not.toContain('wf-run-42');
  });
});
