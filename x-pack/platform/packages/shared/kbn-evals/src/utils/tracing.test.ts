/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, trace } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { getCurrentTraceId, withTaskSpan, withTurnSpan } from './tracing';

describe('withTurnSpan', () => {
  const exporter = new tracing.InMemorySpanExporter();
  const provider = new tracing.BasicTracerProvider({
    spanProcessors: [new tracing.SimpleSpanProcessor(exporter)],
    sampler: new tracing.AlwaysOnSampler(),
  });
  let contextManager: AsyncHooksContextManager;

  beforeAll(() => {
    contextManager = new AsyncHooksContextManager().enable();
    context.setGlobalContextManager(contextManager);
    trace.setGlobalTracerProvider(provider);
  });

  afterAll(() => {
    contextManager.disable();
    context.disable();
    trace.disable();
  });

  it('gives each turn its own trace, linked to the task span', async () => {
    const turnTraceIds = await withTaskSpan('task', {}, async () => [
      await withTurnSpan('turn · t1', { attributes: { 'evals.turn.id': 't1' } }, async () =>
        getCurrentTraceId()
      ),
      await withTurnSpan('turn · t2', { attributes: { 'evals.turn.id': 't2' } }, async () =>
        getCurrentTraceId()
      ),
    ]);

    const spans = exporter.getFinishedSpans();
    const taskSpan = spans.find(({ name }) => name === 'task')!;
    const turnSpans = spans.filter(({ name }) => name.startsWith('turn · '));

    expect(turnSpans).toHaveLength(2);
    const taskTraceId = taskSpan.spanContext().traceId;
    const ids = turnSpans.map((span) => span.spanContext().traceId);
    expect(new Set([taskTraceId, ...ids]).size).toBe(3);
    expect(turnTraceIds).toEqual(ids);

    for (const span of turnSpans) {
      expect(span.parentSpanContext).toBeUndefined();
      expect(span.links.map(({ context: link }) => link.spanId)).toEqual([
        taskSpan.spanContext().spanId,
      ]);
      expect(span.attributes['instrumentationScope.name']).toBe('@kbn/evals');
    }
  });
});
