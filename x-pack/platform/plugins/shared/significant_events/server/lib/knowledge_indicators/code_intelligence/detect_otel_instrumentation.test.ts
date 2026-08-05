/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { detectOtelInstrumentation, EMPTY_OTEL_SIGNAL_COUNTS } from './detect_otel_instrumentation';

const createEsClient = (lines: string[], fail = false): ElasticsearchClient =>
  ({
    esql: {
      query: jest.fn(async ({ params }) => {
        if (fail) throw new Error('grep unavailable');
        const parameters = params as Array<Record<string, unknown>> | undefined;
        const regex = new RegExp(
          String(parameters?.find((parameter) => 'regex' in parameter)?.regex ?? '')
        );
        const matches = lines
          .map((content, index) => ({ content, index }))
          .filter(({ content }) => regex.test(content));
        return {
          columns: [
            { name: 'file.path', type: 'keyword' },
            { name: 'line.number', type: 'integer' },
            { name: 'line.content', type: 'keyword' },
          ],
          values: matches.map(({ content, index }) => ['src/service.ts', index + 1, content]),
        };
      }),
    },
  } as unknown as ElasticsearchClient);

const detect = (lines: string[], fail = false) =>
  detectOtelInstrumentation({
    esClient: createEsClient(lines, fail),
    repository: 'acme/repo',
    gitSha: 'abc',
    serviceRoot: 'src',
    logger: loggerMock.create(),
  });

describe('detectOtelInstrumentation', () => {
  it.each([
    ['@opentelemetry/api', 'instrumentation_other'],
    [
      'go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc',
      'instrumentation_grpc',
    ],
    ['@opentelemetry/instrumentation-http', 'instrumentation_http'],
  ] as const)('detects %s imports', async (line, count) => {
    const result = await detect([line]);
    expect(result.hasOtel).toBe(true);
    expect(result.signalCounts[count]).toBeGreaterThan(0);
  });

  it('requires 3 idiom sites without an import', async () => {
    expect((await detect(['tracer.startSpan("x")', 'span.setAttribute("x", 1)'])).hasOtel).toBe(
      false
    );
    expect(
      (await detect(['tracer.startSpan("x")', 'span.setAttribute("x", 1)', 'span.addEvent("y")']))
        .hasOtel
    ).toBe(true);
  });

  it('returns a false zero result for plain loggers and grep failures', async () => {
    await expect(detect(['logger.info("ok")'])).resolves.toEqual({
      hasOtel: false,
      signalCounts: EMPTY_OTEL_SIGNAL_COUNTS,
    });
    await expect(detect([], true)).resolves.toEqual({
      hasOtel: false,
      signalCounts: EMPTY_OTEL_SIGNAL_COUNTS,
    });
  });
});
