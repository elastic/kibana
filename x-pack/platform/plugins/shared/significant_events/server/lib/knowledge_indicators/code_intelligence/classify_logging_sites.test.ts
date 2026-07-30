/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import { classifyLoggingSites } from './classify_logging_sites';
import type { LoggingCandidate } from './types';

const candidate = (over: Partial<LoggingCandidate> = {}): LoggingCandidate => ({
  location: 'src/ad/Main.java:42',
  content: 'logger.info("hi");',
  via: 'idiom',
  language: 'Java',
  ...over,
});

const mockInference = (
  results: Array<{ id: number; keep: boolean; level?: string; message?: string }> | Error
) => {
  const output = jest.fn(async () => {
    if (results instanceof Error) {
      throw results;
    }
    return { id: 'classify_logging_sites', output: { results }, content: '' };
  });
  return { output } as unknown as InferenceClient & { output: jest.Mock };
};

describe('classifyLoggingSites', () => {
  it('returns [] for no candidates without calling inference', async () => {
    const inferenceClient = mockInference([]);
    const chunks = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates: [],
      logger: loggerMock.create(),
    });
    expect(chunks).toEqual([]);
    expect((inferenceClient as unknown as { output: jest.Mock }).output).not.toHaveBeenCalled();
  });

  it('keeps candidates the classifier marks keep and drops the rest', async () => {
    const candidates = [
      candidate({ location: 'a:1', content: 'logger.error("boom")', via: 'idiom' }),
      candidate({ location: 'b:2', content: 'EventName = "x"', via: 'phrase' }),
    ];
    const inferenceClient = mockInference([
      { id: 0, keep: true, level: 'error', message: 'boom' },
      { id: 1, keep: false },
    ]);

    const chunks = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].location).toBe('a:1');
    // Option 2: valid level+message attaches a classified signature source.
    expect(chunks[0].classified).toEqual({ level: 'error', message: 'boom' });
  });

  it('attaches classified level+message for phrase-only lines (the recall lift)', async () => {
    const candidates = [
      candidate({
        location: 'main.go:355',
        content: 'fmt.Errorf("failed to charge card: %+v", err)',
        via: 'phrase',
      }),
    ];
    const inferenceClient = mockInference([
      { id: 0, keep: true, level: 'error', message: 'failed to charge card' },
    ]);

    const [chunk] = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunk.classified).toEqual({ level: 'error', message: 'failed to charge card' });
  });

  it('keeps a kept line without classified when level/message are missing or invalid', async () => {
    const candidates = [candidate({ location: 'a:1', via: 'idiom' })];
    const inferenceClient = mockInference([{ id: 0, keep: true, level: 'bogus', message: '' }]);

    const [chunk] = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunk.location).toBe('a:1');
    expect(chunk.classified).toBeUndefined();
  });

  it('falls back to idiom-only when inference throws (drops phrase candidates)', async () => {
    const candidates = [
      candidate({ location: 'a:1', via: 'idiom' }),
      candidate({ location: 'b:2', via: 'phrase' }),
    ];
    const inferenceClient = mockInference(new Error('connector down'));

    const chunks = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunks.map((c) => c.location)).toEqual(['a:1']);
    expect(chunks[0].classified).toBeUndefined();
  });

  it('keeps unjudged idiom candidates but drops unjudged phrase candidates when ids are missing', async () => {
    const candidates = [
      candidate({ location: 'a:1', via: 'idiom' }),
      candidate({ location: 'b:2', via: 'phrase' }),
    ];
    // Model returns an empty result set (no ids).
    const inferenceClient = mockInference([]);

    const chunks = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunks.map((c) => c.location)).toEqual(['a:1']);
  });
});
