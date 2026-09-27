/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../services/ml_server_info', () => ({
  getNewJobLimits: jest.fn(() => ({ max_model_memory_limit: '1024mb' })),
}));

import { extractDatafeed } from './edit_utils';

function createJob(datafeedOverrides = {}) {
  return {
    datafeed_config: {
      query: { match_all: {} },
      query_delay: '60s',
      frequency: '150s',
      scroll_size: 1000,
      ...datafeedOverrides,
    },
  };
}

function createNewDatafeedData(overrides = {}) {
  return {
    datafeedQuery: JSON.stringify({ match_all: {} }),
    datafeedQueryDelay: '60s',
    datafeedFrequency: '150s',
    datafeedScrollSize: 1000,
    datafeedProjectRouting: undefined,
    ...overrides,
  };
}

describe('extractDatafeed - max_consecutive_extraction_failures', () => {
  test('includes the field when set to a new positive value', () => {
    const result = extractDatafeed(
      createJob(),
      createNewDatafeedData({ datafeedMaxConsecutiveExtractionFailures: 5 })
    );
    expect(result.max_consecutive_extraction_failures).toBe(5);
  });

  test('includes -1 (disable) as a valid new value', () => {
    const result = extractDatafeed(
      createJob(),
      createNewDatafeedData({ datafeedMaxConsecutiveExtractionFailures: -1 })
    );
    expect(result.max_consecutive_extraction_failures).toBe(-1);
  });

  test('omits the field when left empty', () => {
    const result = extractDatafeed(
      createJob(),
      createNewDatafeedData({ datafeedMaxConsecutiveExtractionFailures: '' })
    );
    expect(result).not.toHaveProperty('max_consecutive_extraction_failures');
  });

  test('omits the field when cleared, preserving an existing value (consistent with frequency)', () => {
    const result = extractDatafeed(
      createJob({ max_consecutive_extraction_failures: 5 }),
      createNewDatafeedData({ datafeedMaxConsecutiveExtractionFailures: '' })
    );
    expect(result).not.toHaveProperty('max_consecutive_extraction_failures');
  });

  test('omits the field when unchanged from the existing value', () => {
    const result = extractDatafeed(
      createJob({ max_consecutive_extraction_failures: 5 }),
      createNewDatafeedData({ datafeedMaxConsecutiveExtractionFailures: 5 })
    );
    expect(result).not.toHaveProperty('max_consecutive_extraction_failures');
  });

  test('includes the field when changed from an existing value', () => {
    const result = extractDatafeed(
      createJob({ max_consecutive_extraction_failures: 5 }),
      createNewDatafeedData({ datafeedMaxConsecutiveExtractionFailures: 10 })
    );
    expect(result.max_consecutive_extraction_failures).toBe(10);
  });
});
