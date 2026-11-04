/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchIndexInfo } from './fetch_index_info';
import { fetchSignificantCategories } from './fetch_significant_categories';
import { fetchSignificantTermPValues } from './fetch_significant_term_p_values';
import { runLogRateAnalysis } from './fetch_log_rate_analysis_for_alert';

jest.mock('./fetch_index_info', () => ({
  fetchIndexInfo: jest.fn(),
}));
jest.mock('./fetch_significant_categories', () => ({
  fetchSignificantCategories: jest.fn(),
}));
jest.mock('./fetch_significant_term_p_values', () => ({
  fetchSignificantTermPValues: jest.fn(),
}));

const fetchIndexInfoMock = fetchIndexInfo as jest.MockedFunction<typeof fetchIndexInfo>;
const fetchSignificantCategoriesMock = fetchSignificantCategories as jest.MockedFunction<
  typeof fetchSignificantCategories
>;
const fetchSignificantTermPValuesMock = fetchSignificantTermPValues as jest.MockedFunction<
  typeof fetchSignificantTermPValues
>;

const windowParameters = {
  baselineMin: 1,
  baselineMax: 2,
  deviationMin: 2,
  deviationMax: 3,
};

describe('runLogRateAnalysis', () => {
  beforeEach(() => {
    fetchIndexInfoMock.mockReset();
    fetchSignificantCategoriesMock.mockReset();
    fetchSignificantTermPValuesMock.mockReset();
    fetchIndexInfoMock.mockResolvedValue({
      keywordFieldCandidates: ['log.level'],
      textFieldCandidates: ['message'],
      baselineTotalDocCount: 20,
      deviationTotalDocCount: 80,
      zeroDocsFallback: false,
    });
    fetchSignificantCategoriesMock.mockResolvedValue([]);
  });

  it('returns mapped items with a p-value and the zero-docs flag', async () => {
    fetchSignificantTermPValuesMock.mockResolvedValue([
      {
        fieldName: 'log.level',
        fieldValue: 'error',
        type: 'keyword',
        doc_count: 10,
        bg_count: 2,
        pValue: 0.01,
      } as never,
    ]);

    const result = await runLogRateAnalysis({
      esClient: {} as never,
      arguments: { index: 'logs-*', windowParameters },
    });

    expect(result.zeroDocsFallback).toBe(false);
    expect(result.significantItems[0]).toEqual(
      expect.objectContaining({
        fieldName: 'log.level',
        fieldValue: 'error',
        pValue: 0.01,
      })
    );
  });

  it('rejects when a worker fails instead of waiting forever', async () => {
    fetchSignificantTermPValuesMock.mockRejectedValue(new Error('bucket limit'));

    await expect(
      runLogRateAnalysis({
        esClient: {} as never,
        arguments: { index: 'logs-*', windowParameters },
      })
    ).rejects.toThrow('bucket limit');
  });
});
