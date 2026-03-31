/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { PatternExtractionService } from './pattern_extraction_service';
import type { PatternExtractionWorkerConfig } from '../../../common/config';

function createTestConfig(
  overrides: Partial<PatternExtractionWorkerConfig> = {}
): PatternExtractionWorkerConfig {
  return {
    enabled: true,
    minThreads: 1,
    maxThreads: 2,
    maxQueue: 10,
    idleTimeout: moment.duration(30, 'seconds'),
    taskTimeout: moment.duration(30, 'seconds'),
    ...overrides,
  };
}

const sampleMessages = [
  '2023-05-30 12:34:56 INFO  Service started on port 8080',
  '2023-05-30 12:35:02 WARN  Service high memory usage: 85%',
  '2023-05-30 12:35:10 ERROR Service failed to respond on port 8080',
];

describe('PatternExtractionService', () => {
  let logger: MockedLogger;
  let service: PatternExtractionService;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  afterEach(async () => {
    const piscinaWorker = (service as unknown as { worker?: { destroy: (opts: object) => void } })
      .worker;
    piscinaWorker?.destroy({ force: true });
  });

  describe('worker integration', () => {
    it('extracts grok patterns through the worker', async () => {
      service = new PatternExtractionService(createTestConfig(), logger);
      const result = await service.extractGrokPatterns(sampleMessages);

      expect(result.type).toBe('grok');
      expect(result.patternGroups).toBeDefined();
      expect(Array.isArray(result.patternGroups)).toBe(true);
    }, 30_000);

    it('times out and recreates pool when extraction exceeds taskTimeout', async () => {
      service = new PatternExtractionService(
        createTestConfig({ taskTimeout: moment.duration(1, 'millisecond') }),
        logger
      );

      const longMessages = Array.from(
        { length: 500 },
        (_, i) => `${i} ${'a'.repeat(200)} ${i} ${'b'.repeat(200)} ${i}`
      );

      await expect(service.extractGrokPatterns(longMessages)).rejects.toThrow(
        'Pattern extraction task timed out'
      );
    }, 30_000);

    it('runs extraction synchronously when worker is disabled', async () => {
      service = new PatternExtractionService(createTestConfig({ enabled: false }), logger);
      const worker = (service as unknown as { worker?: unknown }).worker;
      expect(worker).toBeUndefined();

      const grokResult = await service.extractGrokPatterns(sampleMessages);
      expect(grokResult.type).toBe('grok');
      expect(Array.isArray(grokResult.patternGroups)).toBe(true);
    });
  });

  describe('grok extraction', () => {
    it('extracts grok patterns from sample messages', async () => {
      service = new PatternExtractionService(createTestConfig({ enabled: false }), logger);
      const result = await service.extractGrokPatterns(sampleMessages);

      expect(result.type).toBe('grok');
      expect(result.patternGroups).toBeDefined();
      expect(Array.isArray(result.patternGroups)).toBe(true);
    });

    it('returns empty patternGroups for empty messages', async () => {
      service = new PatternExtractionService(createTestConfig({ enabled: false }), logger);
      const result = await service.extractGrokPatterns([]);

      expect(result.type).toBe('grok');
      expect(result.patternGroups).toEqual([]);
    });
  });

  describe('dissect extraction', () => {
    it('extracts dissect patterns from sample messages', async () => {
      service = new PatternExtractionService(createTestConfig({ enabled: false }), logger);
      const result = await service.extractDissectPattern(sampleMessages);

      expect(result.type).toBe('dissect');
      expect(result.dissectPattern).toBeDefined();
      expect(result.dissectPattern.ast).toBeDefined();
      expect(result.largestGroupMessages).toBeDefined();
    });

    it('returns empty pattern for empty messages', async () => {
      service = new PatternExtractionService(createTestConfig({ enabled: false }), logger);
      const result = await service.extractDissectPattern([]);

      expect(result.type).toBe('dissect');
      expect(result.dissectPattern.ast.nodes).toEqual([]);
      expect(result.largestGroupMessages).toEqual([]);
    });
  });
});
