/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators, parseSelectedEvaluators, isCodeOnlyMode, filterEvaluatorsByKind } from './filter';
import type { Evaluator } from '../types';

describe('evaluator filter', () => {
  const createMockEvaluator = (name: string): Evaluator => ({
    name,
    kind: 'CODE',
    evaluate: jest.fn(),
  });

  const allEvaluators = [
    createMockEvaluator('Precision@5'),
    createMockEvaluator('Precision@10'),
    createMockEvaluator('Precision@20'),
    createMockEvaluator('Recall@5'),
    createMockEvaluator('Recall@10'),
    createMockEvaluator('Recall@20'),
    createMockEvaluator('F1@5'),
    createMockEvaluator('F1@10'),
    createMockEvaluator('F1@20'),
    createMockEvaluator('Factuality'),
    createMockEvaluator('Relevance'),
    createMockEvaluator('Groundedness'),
    createMockEvaluator('Latency'),
  ];

  describe('parseSelectedEvaluators', () => {
    const originalEnv = process.env.SELECTED_EVALUATORS;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.SELECTED_EVALUATORS = originalEnv;
      } else {
        delete process.env.SELECTED_EVALUATORS;
      }
    });

    it('should return empty array when SELECTED_EVALUATORS is not set', () => {
      delete process.env.SELECTED_EVALUATORS;
      expect(parseSelectedEvaluators()).toEqual([]);
    });

    it('should parse comma-separated evaluator names', () => {
      process.env.SELECTED_EVALUATORS = 'Factuality,Relevance,Groundedness';
      expect(parseSelectedEvaluators()).toEqual(['Factuality', 'Relevance', 'Groundedness']);
    });

    it('should trim whitespace from evaluator names', () => {
      process.env.SELECTED_EVALUATORS = ' Factuality , Relevance , Groundedness ';
      expect(parseSelectedEvaluators()).toEqual(['Factuality', 'Relevance', 'Groundedness']);
    });
  });

  describe('selectEvaluators', () => {
    const originalEnv = process.env.SELECTED_EVALUATORS;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.SELECTED_EVALUATORS = originalEnv;
      } else {
        delete process.env.SELECTED_EVALUATORS;
      }
    });

    it('should return all evaluators when SELECTED_EVALUATORS is not set', () => {
      delete process.env.SELECTED_EVALUATORS;
      const result = selectEvaluators(allEvaluators);
      expect(result).toHaveLength(allEvaluators.length);
    });

    it('should filter by exact name match', () => {
      process.env.SELECTED_EVALUATORS = 'Factuality,Relevance';
      const result = selectEvaluators(allEvaluators);
      expect(result.map((e) => e.name)).toEqual(['Factuality', 'Relevance']);
    });

    describe('RAG metric pattern matching', () => {
      it('should match all Precision@{number} evaluators when Precision@K is specified', () => {
        process.env.SELECTED_EVALUATORS = 'Precision@K';
        const result = selectEvaluators(allEvaluators);
        expect(result.map((e) => e.name)).toEqual(['Precision@5', 'Precision@10', 'Precision@20']);
      });

      it('should match all Recall@{number} evaluators when Recall@K is specified', () => {
        process.env.SELECTED_EVALUATORS = 'Recall@K';
        const result = selectEvaluators(allEvaluators);
        expect(result.map((e) => e.name)).toEqual(['Recall@5', 'Recall@10', 'Recall@20']);
      });

      it('should match all F1@{number} evaluators when F1@K is specified', () => {
        process.env.SELECTED_EVALUATORS = 'F1@K';
        const result = selectEvaluators(allEvaluators);
        expect(result.map((e) => e.name)).toEqual(['F1@5', 'F1@10', 'F1@20']);
      });

      it('should match all RAG evaluators when all patterns are specified', () => {
        process.env.SELECTED_EVALUATORS = 'Precision@K,Recall@K,F1@K';
        const result = selectEvaluators(allEvaluators);
        expect(result.map((e) => e.name)).toEqual([
          'Precision@5',
          'Precision@10',
          'Precision@20',
          'Recall@5',
          'Recall@10',
          'Recall@20',
          'F1@5',
          'F1@10',
          'F1@20',
        ]);
      });

      it('should combine pattern matching with exact matching', () => {
        process.env.SELECTED_EVALUATORS = 'Precision@K,Factuality,Latency';
        const result = selectEvaluators(allEvaluators);
        expect(result.map((e) => e.name)).toEqual([
          'Precision@5',
          'Precision@10',
          'Precision@20',
          'Factuality',
          'Latency',
        ]);
      });

      it('should reject exact K-specific evaluator names - users must use @K pattern', () => {
        process.env.SELECTED_EVALUATORS = 'Precision@10,Recall@20';
        const result = selectEvaluators(allEvaluators);
        // K-specific names are rejected, so no evaluators match
        expect(result).toHaveLength(0);
      });

      it('should reject K-specific names but allow @K patterns in the same list', () => {
        process.env.SELECTED_EVALUATORS = 'Precision@10,Recall@K,Factuality';
        const result = selectEvaluators(allEvaluators);
        // Precision@10 is rejected, but Recall@K and Factuality work
        expect(result.map((e) => e.name)).toEqual([
          'Recall@5',
          'Recall@10',
          'Recall@20',
          'Factuality',
        ]);
      });

      it('should not match non-numeric suffixes', () => {
        const evaluatorsWithInvalidNames = [
          ...allEvaluators,
          createMockEvaluator('Precision@abc'),
          createMockEvaluator('Precision@K'),
        ];
        process.env.SELECTED_EVALUATORS = 'Precision@K';
        const result = selectEvaluators(evaluatorsWithInvalidNames);
        expect(result.map((e) => e.name)).toEqual(['Precision@5', 'Precision@10', 'Precision@20']);
      });
    });
  });

  describe('isCodeOnlyMode / filterEvaluatorsByKind', () => {
    const originalEnv = process.env.KBN_EVALS_CODE_ONLY;
    const createEvaluator = (name: string, kind: Evaluator['kind']): Evaluator => ({
      name,
      kind,
      evaluate: jest.fn(),
    });
    const mixedEvaluators = [
      createEvaluator('ExpectedToolCalled', 'CODE'),
      createEvaluator('Factuality', 'LLM'),
      createEvaluator('Relevance', 'LLM'),
      createEvaluator('Trajectory', 'CODE'),
    ];

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.KBN_EVALS_CODE_ONLY = originalEnv;
      } else {
        delete process.env.KBN_EVALS_CODE_ONLY;
      }
    });

    it('isCodeOnlyMode is false when KBN_EVALS_CODE_ONLY is unset', () => {
      delete process.env.KBN_EVALS_CODE_ONLY;
      expect(isCodeOnlyMode()).toBe(false);
    });

    it('isCodeOnlyMode is true only for the literal string "true"', () => {
      process.env.KBN_EVALS_CODE_ONLY = 'true';
      expect(isCodeOnlyMode()).toBe(true);
      process.env.KBN_EVALS_CODE_ONLY = '1';
      expect(isCodeOnlyMode()).toBe(false);
    });

    it('filterEvaluatorsByKind returns evaluators unchanged when code-only mode is off', () => {
      delete process.env.KBN_EVALS_CODE_ONLY;
      expect(filterEvaluatorsByKind(mixedEvaluators)).toEqual(mixedEvaluators);
    });

    it('filterEvaluatorsByKind drops LLM-kind evaluators when code-only mode is on', () => {
      process.env.KBN_EVALS_CODE_ONLY = 'true';
      const result = filterEvaluatorsByKind(mixedEvaluators);
      expect(result.map((e) => e.name)).toEqual(['ExpectedToolCalled', 'Trajectory']);
      expect(result.every((e) => e.kind === 'CODE')).toBe(true);
    });
  });
});
