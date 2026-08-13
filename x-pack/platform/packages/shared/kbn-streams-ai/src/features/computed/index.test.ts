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

    const features = await generateAllComputedFeatures(options);

    expect(features).toHaveLength(1);
    expect(features[0].type).toBe(logSamplesGenerator.type);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(errorLogsGenerator.type));
  });

  // Total failure must surface as a throw, not an empty result.
  it('throws when every generator rejects', async () => {
    [
      datasetAnalysisGenerator,
      logSamplesGenerator,
      logPatternsGenerator,
      errorLogsGenerator,
      codeAnalysisGenerator,
    ].forEach((generator) =>
      jest.spyOn(generator, 'generate').mockRejectedValue(new Error('boom'))
    );

    await expect(generateAllComputedFeatures(options)).rejects.toThrow(
      'All computed feature generators failed'
    );
  });
});
