/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  detectOtelInstrumentation,
  detectOtelInstrumentationForRoots,
} from './detect_otel_instrumentation';
import { createMockCodeboxClient } from './__mocks__/codebox_client';

describe('detectOtelInstrumentation', () => {
  it('detects OTel when import patterns match', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockImplementation(async ({ pattern }: { pattern: string }) => {
      if (
        pattern.includes('otelgrpc') ||
        pattern.includes('otelhttp') ||
        pattern.includes('opentelemetry')
      ) {
        return [
          {
            ref: 'abc',
            path: 'src/main.go',
            lineNumber: 5,
            content: 'import "go.opentelemetry.io/otel"',
          },
        ];
      }
      return [];
    });

    const result = await detectOtelInstrumentation({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger: loggerMock.create(),
    });

    expect(result.hasOtel).toBe(true);
  });

  it('returns hasOtel=false when no patterns match', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([]);

    const result = await detectOtelInstrumentation({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc123',
      serviceRoot: '',
      logger: loggerMock.create(),
    });

    expect(result.hasOtel).toBe(false);
  });

  it('never throws — returns false on failure', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockRejectedValue(new Error('timeout'));

    const result = await detectOtelInstrumentation({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc',
      serviceRoot: '',
      logger: loggerMock.create(),
    });

    expect(result.hasOtel).toBe(false);
  });
});

describe('detectOtelInstrumentationForRoots', () => {
  it('batches detection across multiple service roots', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([]);

    const result = await detectOtelInstrumentationForRoots({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc123',
      serviceRoots: ['svc-a', 'svc-b'],
      logger: loggerMock.create(),
    });

    expect(result.has('svc-a')).toBe(true);
    expect(result.has('svc-b')).toBe(true);
    expect(result.get('svc-a')!.hasOtel).toBe(false);
  });

  it('attributes hits to the correct root', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockImplementation(async ({ pattern }: { pattern: string }) => {
      if (pattern.includes('opentelemetry')) {
        return [
          {
            ref: 'abc',
            path: 'svc-a/main.go',
            lineNumber: 1,
            content: 'import "go.opentelemetry.io/otel"',
          },
        ];
      }
      return [];
    });

    const result = await detectOtelInstrumentationForRoots({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc123',
      serviceRoots: ['svc-a', 'svc-b'],
      logger: loggerMock.create(),
    });

    expect(result.get('svc-a')!.hasOtel).toBe(true);
    expect(result.get('svc-b')!.hasOtel).toBe(false);
  });
});
