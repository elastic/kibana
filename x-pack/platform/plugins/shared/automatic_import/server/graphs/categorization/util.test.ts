/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectResults, diffCategorization, stringArraysEqual } from './util';
import { partialShuffleArray } from '../../../common';
import type { PipelineResult } from './validate';

// Mock the partialShuffleArray function
jest.mock('../../../common', () => ({
  partialShuffleArray: jest.fn(),
}));

describe('selectResults', () => {
  const mockPartialShuffleArray = partialShuffleArray as jest.MockedFunction<
    typeof partialShuffleArray
  >;

  beforeEach(() => {
    mockPartialShuffleArray.mockClear();
  });

  it('should return the correct number of samples and their indices', () => {
    const pipelineResults = [
      { event: { category: ['1'] } },
      { event: { category: ['2'] } },
      { event: { category: ['3'] } },
    ] satisfies PipelineResult[];
    const maxSamples = 2;

    mockPartialShuffleArray.mockImplementation((array, numSamples) => {
      // Mock implementation that does not actually shuffle
      return array;
    });

    const [selectedResults, indices] = selectResults(pipelineResults, maxSamples, new Set());
    expect(selectedResults).toHaveLength(maxSamples);
    expect(indices).toHaveLength(maxSamples);
    expect(indices).toEqual([0, 1]);
    expect(selectedResults).toEqual([pipelineResults[0], pipelineResults[1]]);
  });

  it('should return all results if maxSamples is greater than the number of pipelineResults', () => {
    const pipelineResults: PipelineResult[] = [
      { event: { category: ['1'] } },
      { event: { category: ['2'] } },
    ];
    const maxSamples = 5;

    mockPartialShuffleArray.mockImplementation((array, numSamples) => {
      // Mock implementation that does not actually shuffle
      return array;
    });

    const [selectedResults, indices] = selectResults(pipelineResults, maxSamples, new Set());

    expect(selectedResults).toHaveLength(pipelineResults.length);
    expect(indices).toHaveLength(pipelineResults.length);
    expect(indices).toEqual([0, 1]);
    expect(selectedResults).toEqual(pipelineResults);
  });

  it('should call partialShuffleArray with correct arguments', () => {
    const pipelineResults: PipelineResult[] = [
      { event: { category: ['1'] } },
      { event: { category: ['2'] } },
      { event: { category: ['3'] } },
    ];

    selectResults(pipelineResults, 2, new Set());

    expect(mockPartialShuffleArray).toHaveBeenCalledWith([0, 1], 0, 2);
  });

  it('should handle avoiding indices', () => {
    const pipelineResults = [
      { event: { category: ['1'] } },
      { event: { category: ['2'] } },
      { event: { category: ['3'] } },
    ] satisfies PipelineResult[];
    const maxSamples = 2;

    mockPartialShuffleArray.mockImplementation((array, numSamples) => {
      // Mock implementation that does not actually shuffle
      return array;
    });

    const [selectedResults, indices] = selectResults(pipelineResults, maxSamples, new Set());
    expect(selectedResults).toHaveLength(maxSamples);
    expect(indices).toHaveLength(maxSamples);
    expect(indices).toEqual([0, 1]);
    expect(selectedResults).toEqual([pipelineResults[0], pipelineResults[1]]);
  });

  // Mock the partialShuffleArray function
  jest.mock('../../../common', () => ({
    partialShuffleArray: jest.fn(),
  }));

  describe('selectResults', () => {
    beforeEach(() => {
      mockPartialShuffleArray.mockClear();
    });

    it('should return the correct number of samples and their indices', () => {
      const pipelineResults = [
        { event: { category: ['1'] } },
        { event: { category: ['2'] } },
        { event: { category: ['3'] } },
      ] satisfies PipelineResult[];
      const maxSamples = 2;

      mockPartialShuffleArray.mockImplementation((array, numSamples) => {
        // Mock implementation that does not actually shuffle
        return array;
      });

      const [selectedResults, indices] = selectResults(pipelineResults, maxSamples, new Set());
      expect(selectedResults).toHaveLength(maxSamples);
      expect(indices).toHaveLength(maxSamples);
      expect(indices).toEqual([0, 1]);
      expect(selectedResults).toEqual([pipelineResults[0], pipelineResults[1]]);
    });

    it('should return all results if maxSamples is greater than the number of pipelineResults', () => {
      const pipelineResults: PipelineResult[] = [
        { event: { category: ['1'] } },
        { event: { category: ['2'] } },
      ];
      const maxSamples = 5;

      mockPartialShuffleArray.mockImplementation((array, numSamples) => {
        // Mock implementation that does not actually shuffle
        return array;
      });

      const [selectedResults, indices] = selectResults(pipelineResults, maxSamples, new Set());

      expect(selectedResults).toHaveLength(pipelineResults.length);
      expect(indices).toHaveLength(pipelineResults.length);
      expect(indices).toEqual([0, 1]);
      expect(selectedResults).toEqual(pipelineResults);
    });

    it('should call partialShuffleArray with correct arguments', () => {
      const pipelineResults: PipelineResult[] = [
        { event: { category: ['1'] } },
        { event: { category: ['2'] } },
        { event: { category: ['3'] } },
      ];

      selectResults(pipelineResults, 2, new Set());

      expect(mockPartialShuffleArray).toHaveBeenCalledWith([0, 1], 0, 2);
    });

    it('should handle avoiding indices', () => {
      const pipelineResults = [
        { event: { category: ['1'] } },
        { event: { category: ['2'] } },
        { event: { category: ['3'] } },
      ] satisfies PipelineResult[];
      const maxSamples = 2;

      mockPartialShuffleArray.mockImplementation((array, numSamples) => {
        // Mock implementation that does not actually shuffle
        return array;
      });

      const [selectedResults, indices] = selectResults(pipelineResults, maxSamples, new Set([1]));
      expect(selectedResults).toHaveLength(maxSamples);
      expect(indices).toHaveLength(maxSamples);
      expect(indices).toEqual([0, 2]);
      expect(selectedResults).toEqual([pipelineResults[0], pipelineResults[2]]);
    });
  });

  describe('diffPipelineResults', () => {
    it('should return an empty set if there are no differences', () => {
      const pipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['2'], type: ['type2'] } },
      ];
      const previousPipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['2'], type: ['type2'] } },
      ];

      const result = diffCategorization(pipelineResults, previousPipelineResults);
      expect(result).toEqual(new Set());
    });

    it('should return a set of indices where the categories differ', () => {
      const pipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['2'], type: ['type2'] } },
      ];
      const previousPipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['3'], type: ['type2'] } },
      ];

      const result = diffCategorization(pipelineResults, previousPipelineResults);
      expect(result).toEqual(new Set([1]));
    });

    it('should return a set of indices where the types differ', () => {
      const pipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['2'], type: ['type2'] } },
      ];
      const previousPipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['2'], type: ['type3'] } },
      ];

      const result = diffCategorization(pipelineResults, previousPipelineResults);
      expect(result).toEqual(new Set([1]));
    });

    it('should return a set of indices where both categories and types differ', () => {
      const pipelineResults: PipelineResult[] = [
        { event: { category: ['1'], type: ['type1'] } },
        { event: { category: ['2'], type: ['type2'] } },
      ];
      const previousPipelineResults: PipelineResult[] = [
        { event: { category: ['3'], type: ['type3'] } },
        { event: { category: ['4'], type: ['type4'] } },
      ];

      const result = diffCategorization(pipelineResults, previousPipelineResults);
      expect(result).toEqual(new Set([0, 1]));
    });

    describe('stringArraysEqual', () => {
      it('should return true for equal arrays', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b', 'c'];
        expect(stringArraysEqual(arr1, arr2)).toBe(true);
      });

      it('should return false for arrays of different lengths', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b'];
        expect(stringArraysEqual(arr1, arr2)).toBe(false);
      });

      it('should return false for arrays with different elements', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b', 'd'];
        expect(stringArraysEqual(arr1, arr2)).toBe(false);
      });

      it('should return false for arrays with same elements in different order', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['c', 'b', 'a'];
        expect(stringArraysEqual(arr1, arr2)).toBe(false);
      });

      it('should return true for empty arrays', () => {
        const arr1: string[] = [];
        const arr2: string[] = [];
        expect(stringArraysEqual(arr1, arr2)).toBe(true);
      });
    });
  });
});
