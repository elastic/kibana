/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { wrapTaskRun } from './traces';

describe('wrapTaskRun', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new TracerProvider({
    spanProcessors: [new SimpleSpanProcessor({ exporter })],
  });

  beforeAll(() => {
    trace.setGlobalTracerProvider(provider);
  });

  beforeEach(() => {
    exporter.reset();
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  const wrap = <T>(run: () => Promise<T>) =>
    wrapTaskRun({ spanName: 'test.run', namespace: 'default', run });

  it('marks the span as failed and returns the result when the run returns an error', async () => {
    const result = { state: { namespace: 'default' }, error: new Error('step failed') };

    await expect(wrap(async () => result)).resolves.toBe(result);

    const [span] = exporter.getFinishedSpans();
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: 'step failed' });
    expect(span.events.map(({ name }) => name)).toEqual(['exception']);
  });

  it('leaves the span OK when the run returns no error', async () => {
    const result = { state: { namespace: 'default' } };

    await expect(wrap(async () => result)).resolves.toBe(result);

    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.OK);
  });

  it('rejects with the original error when the run throws', async () => {
    const error = new Error('boom');

    await expect(wrap(() => Promise.reject(error))).rejects.toBe(error);

    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
  });
});
