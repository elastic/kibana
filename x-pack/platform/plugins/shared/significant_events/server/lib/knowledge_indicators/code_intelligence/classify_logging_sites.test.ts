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
      candidate({ location: 'a:1', content: 'logger.error("boom")' }),
      candidate({ location: 'b:2', content: 'log.Printf("%s", eventNameConst)' }),
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
    // A valid level+message attaches a classified signature source.
    expect(chunks[0].classified).toEqual({ level: 'error', message: 'boom' });
  });

  it('includes the file path and language in the classifier input', async () => {
    const candidates = [
      candidate({
        location: 'o11y/Makefile:62',
        language: 'Make',
        content: 'echo "Error: No resources specified. USAGE: make taint ..."',
      }),
    ];
    const output = jest.fn(async (_request: { input: string; system: string }) => ({
      id: 'classify_logging_sites',
      output: { results: [{ id: 0, keep: false }] },
      content: '',
    }));
    const inferenceClient = { output } as unknown as InferenceClient;

    await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    const { input, system } = output.mock.calls[0][0];
    // Path (without the trailing :line) and language are provided as context.
    expect(input).toContain('0\to11y/Makefile\tMake\t');
    // Prompt instructs dropping build/tooling output.
    expect(system).toContain('BUILD / TOOLING / CI output');
  });

  it('attaches classified level+message for lines the regex cannot parse', async () => {
    const candidates = [
      candidate({
        location: 'main.go:355',
        content: 'panic("failed to charge card")',
      }),
    ];
    const inferenceClient = mockInference([
      { id: 0, keep: true, level: 'fatal', message: 'failed to charge card' },
    ]);

    const [chunk] = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunk.classified).toEqual({ level: 'fatal', message: 'failed to charge card' });
  });

  it('instructs the classifier to drop value-returning error constructors', async () => {
    const output = jest.fn(async (_request: { system: string }) => ({
      id: 'classify_logging_sites',
      output: { results: [{ id: 0, keep: false }] },
      content: '',
    }));

    await classifyLoggingSites({
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'c',
      candidates: [candidate({ content: 'return fmt.Errorf("failed to charge card: %+v", err)' })],
      logger: loggerMock.create(),
    });

    expect(output.mock.calls[0][0].system).toContain('VALUE-RETURNING error constructors');
  });

  it('keeps a kept line without classified when level/message are missing or invalid', async () => {
    const candidates = [candidate({ location: 'a:1' })];
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

  it('classifies batches concurrently with a maximum concurrency of 5', async () => {
    const candidates = Array.from({ length: 1_200 }, (_, index) =>
      candidate({ location: `src/main.ts:${index}` })
    );
    let active = 0;
    let maxActive = 0;
    const output = jest.fn(async (request: { input: string }) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      const results = request.input
        .split('\n')
        .slice(1)
        .map((line) => ({ id: Number(line.split('\t')[0]), keep: true }));
      return { id: 'classify_logging_sites', output: { results }, content: '' };
    });

    const chunks = await classifyLoggingSites({
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(output).toHaveBeenCalledTimes(6);
    expect(maxActive).toBe(5);
    expect(chunks).toHaveLength(1_200);
    expect(chunks[1_199].location).toBe('src/main.ts:1199');
  });

  it('aborts a slow batch at its deadline and keeps that batch unjudged', async () => {
    const candidates = [candidate({ location: 'a:1' })];
    const output = jest.fn(
      ({ abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        })
    );
    const logger = loggerMock.create();

    const chunks = await classifyLoggingSites({
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'c',
      candidates,
      logger,
      batchTimeoutMs: 1,
    });

    expect(chunks.map(({ location }) => location)).toEqual(['a:1']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('keeping its idiom candidates')
    );
  });

  it('degrades only a failed batch and merges successful batch decisions by global id', async () => {
    const candidates = Array.from({ length: 450 }, (_, index) =>
      candidate({ location: `src/main.ts:${index}` })
    );
    const output = jest.fn(async (request: { input: string }) => {
      const ids = request.input
        .split('\n')
        .slice(1)
        .map((line) => Number(line.split('\t')[0]));
      if (ids[0] === 200) {
        throw new Error('batch down');
      }
      return {
        id: 'classify_logging_sites',
        output: { results: ids.map((id) => ({ id, keep: false })) },
        content: '',
      };
    });

    const chunks = await classifyLoggingSites({
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(output).toHaveBeenCalledTimes(3);
    // The failed batch's candidates survive unjudged; successful false decisions drop theirs.
    expect(chunks).toHaveLength(200);
    expect(chunks[0].location).toBe('src/main.ts:200');
    expect(chunks[199].location).toBe('src/main.ts:399');
  });

  it('ignores a successful batch decision for another batch id', async () => {
    const candidates = Array.from({ length: 400 }, (_, index) =>
      candidate({ location: `src/main.ts:${index}` })
    );
    const output = jest.fn(async (request: { input: string }) => {
      const firstId = Number(request.input.split('\n')[1].split('\t')[0]);
      if (firstId === 0) {
        return {
          id: 'classify_logging_sites',
          output: { results: [{ id: 200, keep: false }] },
          content: '',
        };
      }
      throw new Error('batch down');
    });

    const chunks = await classifyLoggingSites({
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    // Batch 2 failed, so a batch 1 response cannot drop any of its candidates.
    expect(chunks).toHaveLength(400);
    expect(chunks[200].location).toBe('src/main.ts:200');
  });

  it('keeps every candidate unjudged when inference throws', async () => {
    const candidates = [candidate({ location: 'a:1' }), candidate({ location: 'b:2' })];
    const inferenceClient = mockInference(new Error('connector down'));

    const chunks = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunks.map((c) => c.location)).toEqual(['a:1', 'b:2']);
    expect(chunks[0].classified).toBeUndefined();
  });

  it('keeps unjudged candidates when the model omits their ids', async () => {
    const candidates = [candidate({ location: 'a:1' }), candidate({ location: 'b:2' })];
    // Model returns an empty result set (no ids).
    const inferenceClient = mockInference([]);

    const chunks = await classifyLoggingSites({
      inferenceClient,
      connectorId: 'c',
      candidates,
      logger: loggerMock.create(),
    });

    expect(chunks.map((c) => c.location)).toEqual(['a:1', 'b:2']);
  });
});
