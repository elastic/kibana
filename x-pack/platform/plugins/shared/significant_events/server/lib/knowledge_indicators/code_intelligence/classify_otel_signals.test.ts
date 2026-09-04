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

  it('restores every deterministic candidate from a tier the classifier dropped', async () => {
    const mixedCandidates = generateOtelQueries({
      serviceName: 'checkout',
      repository: 'acme/repo',
      gitSha: 'abc',
      signals: [
        { kind: 'span_name', value: 'charge', language: 'TypeScript', file: 'src/a.ts', line: 1 },
        {
          kind: 'metric_name',
          value: 'checkout.requests',
          metricKind: 'counter',
          language: 'TypeScript',
          file: 'src/a.ts',
          line: 2,
        },
      ],
      signalCounts: EMPTY_OTEL_SIGNAL_COUNTS,
      traceStreams: ['traces-otel-a', 'traces-otel-b'],
      traceStreamNames: ['traces-owner-a', 'traces-owner-b'],
      metricStreams: ['metrics-otel'],
      logStreams: [],
    }).queries;
    const logger = loggerMock.create();
    const inferenceClient = {
      output: jest.fn(async () => ({
        output: {
          results: mixedCandidates.map((candidate, id) => ({
            id,
            keep: candidate.tier === 'metric_name' || candidate.stream === 'traces-owner-a',
            title: `classified ${id}`,
            description: 'classified',
            severity_score: 60,
          })),
        },
      })),
    } as unknown as InferenceClient;

    const result = await classifyOtelSignals({
      inferenceClient,
      connectorId: 'connector',
      candidates: mixedCandidates,
      logger,
    });

    expect(result.filter(({ stream }) => stream === 'traces-owner-b')).toEqual(
      mixedCandidates.filter(({ stream }) => stream === 'traces-owner-b')
    );
    expect(result.find(({ tier }) => tier === 'metric_name')?.query.title).toContain('classified');
    expect(result.some(({ stream }) => stream === 'traces-owner-b')).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('traces-owner-b:span_name'));
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
