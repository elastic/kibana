/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnalysisTarget } from '../../../shared/analysis_target';
import { generateAllComputedFeatures } from '.';
import { datasetAnalysisGenerator } from './dataset_analysis';
import { logSamplesGenerator } from './log_samples';
import { logPatternsGenerator } from './log_patterns';
import { errorLogsGenerator } from './error_logs';
import { codeAnalysisGenerator } from './code_analysis';

describe('generateAllComputedFeatures', () => {
  const logger = { warn: jest.fn() } as unknown as Logger;
  const options = {
    target: {
      id: 'logs.test-default',
      name: 'logs.test-default',
      sources: ['logs.test-default', 'logs.test-default.*'],
      samplingSource: 'logs.test-default',
    } satisfies AnalysisTarget,
    start: 0,
    end: 1,
    esClient: {} as ElasticsearchClient,
    logger,
  };

  afterEach(() => jest.restoreAllMocks());

  it('logs and skips a rejected generator while keeping the successful ones', async () => {
    [datasetAnalysisGenerator, logPatternsGenerator, codeAnalysisGenerator].forEach((generator) =>
      jest.spyOn(generator, 'generate').mockResolvedValue(undefined)
    );
    jest.spyOn(errorLogsGenerator, 'generate').mockRejectedValue(new Error('boom'));
    jest.spyOn(logSamplesGenerator, 'generate').mockResolvedValue({ samples: [] });

    const { features } = await generateAllComputedFeatures(options);

    expect(features).toHaveLength(1);
    expect(features[0].type).toBe(logSamplesGenerator.type);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(errorLogsGenerator.type));
  });

  it('throws when failures leave no features, alongside a skipped generator', async () => {
    [
      datasetAnalysisGenerator,
      logSamplesGenerator,
      logPatternsGenerator,
      errorLogsGenerator,
    ].forEach((generator) =>
      jest.spyOn(generator, 'generate').mockRejectedValue(new Error('boom'))
    );
    jest.spyOn(codeAnalysisGenerator, 'generate').mockResolvedValue(undefined);

    await expect(generateAllComputedFeatures(options)).rejects.toThrow(
      'All computed feature generators failed'
    );
  });

  it('passes a single request+timeout signal to every generator', async () => {
    const seen: AbortSignal[] = [];
    [
      datasetAnalysisGenerator,
      logSamplesGenerator,
      logPatternsGenerator,
      errorLogsGenerator,
      codeAnalysisGenerator,
    ].forEach((generator) =>
      jest.spyOn(generator, 'generate').mockImplementation(async ({ signal }) => {
        seen.push(signal);
        return undefined;
      })
    );

    const controller = new AbortController();
    await generateAllComputedFeatures({ ...options, requestSignal: controller.signal });

    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(1);
    controller.abort();
    expect(seen[0].aborted).toBe(true);
  });

  it('logs all generators as failed when the shared signal is already aborted', async () => {
    const aborted = AbortSignal.abort(new DOMException('signal timed out', 'TimeoutError'));

    [
      datasetAnalysisGenerator,
      logSamplesGenerator,
      logPatternsGenerator,
      errorLogsGenerator,
      codeAnalysisGenerator,
    ].forEach((generator) =>
      jest.spyOn(generator, 'generate').mockImplementation(async ({ signal }) => {
        if (signal.aborted) throw signal.reason;
        return undefined;
      })
    );

    await expect(
      generateAllComputedFeatures({ ...options, requestSignal: aborted })
    ).rejects.toThrow('All computed feature generators failed');

    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/"[^"]+" failed:/));
  });

  it('returns empty without throwing when all generators skip and none fail', async () => {
    [
      datasetAnalysisGenerator,
      logSamplesGenerator,
      logPatternsGenerator,
      errorLogsGenerator,
      codeAnalysisGenerator,
    ].forEach((generator) => jest.spyOn(generator, 'generate').mockResolvedValue(undefined));

    await expect(generateAllComputedFeatures(options)).resolves.toEqual({
      features: [],
      errors: [],
    });
  });
});
