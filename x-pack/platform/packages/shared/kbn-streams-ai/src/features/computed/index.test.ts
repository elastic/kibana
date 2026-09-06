/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import { generateAllComputedFeatures } from '.';
import { datasetAnalysisGenerator } from './dataset_analysis';
import { logSamplesGenerator } from './log_samples';
import { logPatternsGenerator } from './log_patterns';
import { errorLogsGenerator } from './error_logs';
import { codeAnalysisGenerator } from './code_analysis';

describe('generateAllComputedFeatures', () => {
  const logger = { warn: jest.fn() } as unknown as Logger;
  const options = {
    stream: { name: 'logs.test-default' } as Streams.all.Definition,
    start: 0,
    end: 1,
    esClient: {} as ElasticsearchClient,
    logger,
  };

  afterEach(() => jest.restoreAllMocks());

  // A single failure must not lose the other generators' features.
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

  // A skipped generator (undefined) must not mask a total failure of the rest.
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

  // Nothing produced with no failures is legitimate, not an error.
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
