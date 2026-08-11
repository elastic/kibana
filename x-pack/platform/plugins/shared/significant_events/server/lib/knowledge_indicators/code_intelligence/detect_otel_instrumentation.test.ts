/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  detectOtelInstrumentation,
  detectOtelInstrumentationForRoots,
  EMPTY_OTEL_SIGNAL_COUNTS,
} from './detect_otel_instrumentation';

type SourceLine = string | { content: string; filePath: string };

const createEsClient = (lines: SourceLine[], fail = false): ElasticsearchClient =>
  ({
    esql: {
      query: jest.fn(async ({ params }) => {
        if (fail) throw new Error('grep unavailable');
        const parameters = params as Array<Record<string, unknown>> | undefined;
        const regex = new RegExp(
          String(parameters?.find((parameter) => 'regex' in parameter)?.regex ?? '')
        );
        const matches = lines
          .map((line, index) =>
            typeof line === 'string'
              ? { content: line, filePath: 'src/service.ts', index }
              : { ...line, index }
          )
          .filter(({ content }) => regex.test(content));
        return {
          columns: [
            { name: 'file.path', type: 'keyword' },
            { name: 'line.number', type: 'integer' },
            { name: 'line.content', type: 'keyword' },
          ],
          values: matches.map(({ content, filePath, index }) => [filePath, index + 1, content]),
        };
      }),
    },
  } as unknown as ElasticsearchClient);

const detect = (lines: SourceLine[], fail = false) =>
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
    const result = await detect([`import instrumentation from "${line}"`]);
    expect(result.hasOtel).toBe(true);
    expect(result.signalCounts[count]).toBeGreaterThan(0);
  });

  it('detects a Go grouped-import module line', async () => {
    const result = await detect([
      {
        filePath: 'cmd/service/main.go',
        content: '"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"',
      },
    ]);
    expect(result.hasOtel).toBe(true);
    expect(result.signalCounts.instrumentation_http).toBeGreaterThan(0);
  });

  it('does not count lockfile references as instrumentation', async () => {
    const result = await detect([
      {
        filePath: 'package-lock.json',
        content: '"@opentelemetry/instrumentation-http": "1.0.0"',
      },
    ]);
    expect(result).toEqual({ hasOtel: false, signalCounts: EMPTY_OTEL_SIGNAL_COUNTS });
  });

  it('gates on 3 idiom sites when one is an unambiguous OTel idiom', async () => {
    expect((await detect(['tracer.startSpan("x")', 'span.setAttribute("x", 1)'])).hasOtel).toBe(
      false
    );
    expect(
      (await detect(['tracer.startSpan("x")', 'span.setAttribute("x", 1)', 'span.addEvent("y")']))
        .hasOtel
    ).toBe(true);
  });

  it('does not treat 3 ambiguous idiom sites as OTel without an import', async () => {
    expect(
      (
        await detect([
          'element.setAttribute("x", 1)',
          'element.setAttribute("y", 2)',
          'element.setAttribute("z", 3)',
        ])
      ).hasOtel
    ).toBe(false);
  });

  it('batches detection across roots with inclusive attribution', async () => {
    const esClient = createEsClient([
      { filePath: 'src/a.go', content: 'import "go.opentelemetry.io/otel"' },
      {
        filePath: 'services/b/main.go',
        content: 'import "go.opentelemetry.io/contrib/instrumentation/x/otelgrpc"',
      },
    ]);
    const result = await detectOtelInstrumentationForRoots({
      esClient,
      repository: 'acme/repo',
      gitSha: 'abc',
      serviceRoots: ['src', 'services/b'],
      logger: loggerMock.create(),
    });
    expect(result.get('src')?.hasOtel).toBe(true);
    expect(result.get('services/b')?.hasOtel).toBe(true);
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
