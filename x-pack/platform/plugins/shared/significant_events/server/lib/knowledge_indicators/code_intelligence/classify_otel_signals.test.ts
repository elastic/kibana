/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import { EMPTY_OTEL_SIGNAL_COUNTS } from './detect_otel_instrumentation';
import { generateOtelQueries } from './generate_otel_queries';
import { classifyOtelSignals } from './classify_otel_signals';

const candidates = generateOtelQueries({
  serviceName: 'checkout',
  repository: 'acme/repo',
  gitSha: 'abc',
  signals: [
    { kind: 'span_name', value: 'charge', language: 'TypeScript', file: 'src/a.ts', line: 1 },
  ],
  signalCounts: EMPTY_OTEL_SIGNAL_COUNTS,
  traceStreams: ['traces-otel'],
  metricStreams: [],
  logStreams: [],
}).queries;

describe('classifyOtelSignals', () => {
  it('applies model titles and severities', async () => {
    const inferenceClient = {
      output: jest.fn(async () => ({
        output: {
          results: [
            {
              id: 0,
              keep: true,
              title: 'Charge failures',
              description: 'Failures',
              severity_score: 75,
            },
          ],
        },
      })),
    } as unknown as InferenceClient;
    const result = await classifyOtelSignals({
      inferenceClient,
      connectorId: 'connector',
      candidates,
      logger: loggerMock.create(),
    });
    expect(result[0].query).toMatchObject({
      title: 'Charge failures',
      description: 'Failures',
      severity_score: 75,
    });
  });

  it('keeps all deterministic queries when inference fails', async () => {
    const logger = loggerMock.create();
    const inferenceClient = {
      output: jest.fn(async () => {
        throw new Error('down');
      }),
    } as unknown as InferenceClient;
    const result = await classifyOtelSignals({
      inferenceClient,
      connectorId: 'connector',
      candidates,
      logger,
    });
    expect(result).toEqual(candidates);
    expect(logger.warn).toHaveBeenCalled();
  });
});
