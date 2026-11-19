/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokExtractionResult, DissectExtractionResult } from './types';
import type { IPatternExtractionService } from './pattern_extraction_service';

export const createPatternExtractionServiceMock = (): jest.Mocked<IPatternExtractionService> => {
  const mock: jest.Mocked<IPatternExtractionService> = {
    extractGrokPatterns: jest.fn(
      (_messages: string[]): Promise<GrokExtractionResult> =>
        Promise.resolve({ type: 'grok', patternGroups: [] })
    ),
    extractDissectPattern: jest.fn(
      (_messages: string[]): Promise<DissectExtractionResult> =>
        Promise.resolve({
          type: 'dissect',
          dissectPattern: { ast: { nodes: [] }, fields: [] },
          largestGroupMessages: [],
        })
    ),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  return mock;
};
