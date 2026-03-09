/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { createQueryClientWrapper, defaultTestFormValues } from '../../test_utils';
import { useRecoveryValidation } from './use_recovery_validation';
import { useRecoveryQueryGroupingValidation } from './use_recovery_query_grouping_validation';
import type { FormValues } from '../types';

jest.mock('@kbn/alerting-v2-schemas', () => ({
  validateEsqlQuery: jest.fn(),
}));

jest.mock('./use_recovery_query_grouping_validation');

const { validateEsqlQuery } = jest.requireMock('@kbn/alerting-v2-schemas');
const mockUseRecoveryQueryGroupingValidation = jest.mocked(useRecoveryQueryGroupingValidation);
const createMockSearch = () => dataPluginMock.createStartContract().search.search;

const createFormAndQueryWrapper = (defaultValues: Partial<FormValues> = {}) => {
  const queryClientWrapper = createQueryClientWrapper();

  return ({ children }: { children: React.ReactNode }) => {
    const form = useForm<FormValues>({
      defaultValues: { ...defaultTestFormValues, ...defaultValues },
    });
    const QueryWrapper = queryClientWrapper;

    return (
      <QueryWrapper>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryWrapper>
    );
  };
};

describe('useRecoveryValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateEsqlQuery.mockReturnValue(undefined);
    mockUseRecoveryQueryGroupingValidation.mockReturnValue({
      validationError: undefined,
      missingColumns: [],
      isValidating: false,
      queryColumns: [],
      queryError: undefined,
      recoveryColumns: [],
    });
  });

  const renderValidationHook = (defaultValues: Partial<FormValues> = {}) => {
    const search = createMockSearch();
    return renderHook(() => useRecoveryValidation({ search }), {
      wrapper: createFormAndQueryWrapper(defaultValues),
    });
  };

  describe('computed state', () => {
    it('sets hasEvaluationCondition to true when evaluation condition exists', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
      });

      expect(result.current.hasEvaluationCondition).toBe(true);
    });

    it('sets hasEvaluationCondition to false when no evaluation condition', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      expect(result.current.hasEvaluationCondition).toBe(false);
    });

    it('sets hasEvaluationCondition to false when evaluation condition is whitespace', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: '   ' } },
      });

      expect(result.current.hasEvaluationCondition).toBe(false);
    });

    describe('assembledEvaluationQuery', () => {
      it('assembles base and condition', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        });

        expect(result.current.assembledEvaluationQuery).toBe('FROM logs-* | WHERE status > 500');
      });

      it('returns just base when no condition', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
        });

        expect(result.current.assembledEvaluationQuery).toBe('FROM logs-*');
      });

      it('returns empty string when no base', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: '' } },
        });

        expect(result.current.assembledEvaluationQuery).toBe('');
      });
    });

    describe('effectiveBaseQuery (split mode)', () => {
      it('returns recovery base query when provided', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM metrics-*', condition: 'WHERE status < 200' },
          },
        });

        expect(result.current.effectiveBaseQuery).toBe('FROM metrics-*');
      });

      it('falls back to evaluation base query when recovery base is empty', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
          recoveryPolicy: {
            type: 'query',
            query: { condition: 'WHERE status < 200' },
          },
        });

        expect(result.current.effectiveBaseQuery).toBe('FROM logs-*');
      });

      it('returns empty string in non-split mode', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM metrics-*' },
          },
        });

        expect(result.current.effectiveBaseQuery).toBe('');
      });
    });

    describe('assembledRecoveryQuery', () => {
      it('assembles base + condition in split mode', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
          recoveryPolicy: {
            type: 'query',
            query: { condition: 'WHERE status < 200' },
          },
        });

        expect(result.current.assembledRecoveryQuery).toBe('FROM logs-* | WHERE status < 200');
      });

      it('returns just effective base in split mode when no recovery condition', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM metrics-*' },
          },
        });

        expect(result.current.assembledRecoveryQuery).toBe('FROM metrics-*');
      });

      it('returns recovery base query in non-split mode', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM metrics-* | STATS count = COUNT(*)' },
          },
        });

        expect(result.current.assembledRecoveryQuery).toBe(
          'FROM metrics-* | STATS count = COUNT(*)'
        );
      });

      it('returns empty string in non-split mode when no recovery base', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
        });

        expect(result.current.assembledRecoveryQuery).toBe('');
      });
    });

    describe('recoveryMatchesEvaluation', () => {
      it('is true when assembled queries are identical', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
          recoveryPolicy: { type: 'query', query: { base: 'FROM logs-*' } },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(true);
      });

      it('is true when assembled queries match case-insensitively', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
          recoveryPolicy: { type: 'query', query: { base: 'from logs-*' } },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(true);
      });

      it('is true in split mode when condition matches', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
          recoveryPolicy: { type: 'query', query: { condition: 'WHERE status > 500' } },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(true);
      });

      it('is false when queries differ', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
          recoveryPolicy: { type: 'query', query: { base: 'FROM metrics-*' } },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(false);
      });

      it('is false in split mode when base differs even if condition matches', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM metrics-*', condition: 'WHERE status > 500' },
          },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(false);
      });

      it('is false when recovery query is empty', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: 'FROM logs-*' } },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(false);
      });

      it('is false when evaluation query is empty', () => {
        const { result } = renderValidationHook({
          evaluation: { query: { base: '' } },
          recoveryPolicy: { type: 'query', query: { base: 'FROM logs-*' } },
        });

        expect(result.current.recoveryMatchesEvaluation).toBe(false);
      });
    });
  });

  describe('grouping validation', () => {
    it('passes assembledRecoveryQuery to useRecoveryQueryGroupingValidation', () => {
      renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-*' },
        },
      });

      expect(mockUseRecoveryQueryGroupingValidation).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'FROM metrics-*',
        })
      );
    });

    it('returns undefined groupingValidationError when no grouping error', () => {
      const { result } = renderValidationHook();

      expect(result.current.groupingValidationError).toBeUndefined();
    });

    it('exposes groupingValidationError from useRecoveryQueryGroupingValidation', () => {
      mockUseRecoveryQueryGroupingValidation.mockReturnValue({
        validationError: 'Recovery query is missing columns: host.name',
        missingColumns: ['host.name'],
        isValidating: false,
        queryColumns: [],
        queryError: undefined,
        recoveryColumns: [],
      });

      const { result } = renderValidationHook();

      expect(result.current.groupingValidationError).toBe(
        'Recovery query is missing columns: host.name'
      );
    });
  });

  describe('fullBaseQueryRules (non-split mode)', () => {
    it('includes a required message', () => {
      const { result } = renderValidationHook();

      expect(result.current.fullBaseQueryRules.required).toBeDefined();
      expect(typeof result.current.fullBaseQueryRules.required).toBe('string');
    });

    it('validate returns true for undefined value', () => {
      const { result } = renderValidationHook();

      expect(result.current.fullBaseQueryRules.validate(undefined)).toBe(true);
    });

    it('validate returns true for empty string', () => {
      const { result } = renderValidationHook();

      expect(result.current.fullBaseQueryRules.validate('')).toBe(true);
    });

    it('validate returns syntax error for invalid ES|QL', () => {
      validateEsqlQuery.mockReturnValue('Invalid ES|QL query: unexpected token');

      const { result } = renderValidationHook();

      expect(result.current.fullBaseQueryRules.validate('INVALID QUERY')).toBe(
        'Invalid ES|QL query: unexpected token'
      );
    });

    it('validate returns grouping error when grouping fields are missing', () => {
      const groupingError = 'Recovery query is missing columns: host.name';
      mockUseRecoveryQueryGroupingValidation.mockReturnValue({
        validationError: groupingError,
        missingColumns: ['host.name'],
        isValidating: false,
        queryColumns: [],
        queryError: undefined,
        recoveryColumns: [],
      });

      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      expect(
        result.current.fullBaseQueryRules.validate('FROM logs-* | STATS count = COUNT(*)')
      ).toBe(groupingError);
    });

    it('validate returns error when recovery query matches evaluation query', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
        recoveryPolicy: { type: 'query', query: { base: 'FROM logs-*' } },
      });

      const error = result.current.fullBaseQueryRules.validate('FROM logs-*');

      expect(typeof error).toBe('string');
      expect(error).toContain('must differ from the evaluation query');
    });

    it('validate is case-insensitive when comparing queries', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
        recoveryPolicy: { type: 'query', query: { base: 'from logs-*' } },
      });

      const error = result.current.fullBaseQueryRules.validate('from logs-*');

      expect(typeof error).toBe('string');
      expect(error).toContain('must differ from the evaluation query');
    });

    it('validate returns true for a valid, different query', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      expect(result.current.fullBaseQueryRules.validate('FROM metrics-*')).toBe(true);
    });

    it('validate checks syntax before grouping or differs-from-eval', () => {
      validateEsqlQuery.mockReturnValue('Invalid ES|QL query: parse error');
      mockUseRecoveryQueryGroupingValidation.mockReturnValue({
        validationError: 'Recovery query is missing columns: host.name',
        missingColumns: ['host.name'],
        isValidating: false,
        queryColumns: [],
        queryError: undefined,
        recoveryColumns: [],
      });

      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      // Should return syntax error, not grouping error
      expect(result.current.fullBaseQueryRules.validate('BAD QUERY')).toBe(
        'Invalid ES|QL query: parse error'
      );
    });
  });

  describe('splitBaseQueryRules (split mode base query)', () => {
    it('validate returns true for undefined value', () => {
      const { result } = renderValidationHook();

      expect(result.current.splitBaseQueryRules.validate(undefined)).toBe(true);
    });

    it('validate returns true for empty string', () => {
      const { result } = renderValidationHook();

      expect(result.current.splitBaseQueryRules.validate('')).toBe(true);
    });

    it('validate returns syntax error for invalid ES|QL', () => {
      validateEsqlQuery.mockReturnValue('Invalid ES|QL query: unexpected token');

      const { result } = renderValidationHook();

      expect(result.current.splitBaseQueryRules.validate('INVALID')).toBe(
        'Invalid ES|QL query: unexpected token'
      );
    });

    it('validate returns true for valid ES|QL (no grouping or differs checks)', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
      });

      // Same as evaluation base — splitBaseQueryRules should NOT check differs-from-eval
      expect(result.current.splitBaseQueryRules.validate('FROM logs-*')).toBe(true);
    });

    it('does not have a required rule', () => {
      const { result } = renderValidationHook();

      expect((result.current.splitBaseQueryRules as any).required).toBeUndefined();
    });
  });

  describe('conditionRules (split mode condition)', () => {
    it('validate returns error when neither base nor condition is provided', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: {} },
      });

      const error = result.current.conditionRules.validate(undefined);

      expect(typeof error).toBe('string');
      expect(error).toContain(
        'Either a recovery base query or recovery condition must be specified'
      );
    });

    it('validate returns error when both base and condition are empty strings', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: { base: '', condition: '' } },
      });

      const error = result.current.conditionRules.validate('');

      expect(typeof error).toBe('string');
      expect(error).toContain(
        'Either a recovery base query or recovery condition must be specified'
      );
    });

    it('validate returns error when assembled queries match (same base + same condition)', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: { condition: 'WHERE status > 500' } },
      });

      const error = result.current.conditionRules.validate('WHERE status > 500');

      expect(typeof error).toBe('string');
      expect(error).toContain('must differ from the evaluation query');
    });

    it('validate returns error case-insensitively when assembled queries match', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: { condition: 'where STATUS > 500' } },
      });

      const error = result.current.conditionRules.validate('where STATUS > 500');

      expect(typeof error).toBe('string');
      expect(error).toContain('must differ from the evaluation query');
    });

    it('validate passes when base differs even if condition matches evaluation', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-*', condition: 'WHERE status > 500' },
        },
      });

      // Different base means assembled queries differ, even with the same condition
      expect(result.current.conditionRules.validate('WHERE status > 500')).toBe(true);
    });

    it('validate returns grouping error when grouping fields are missing', () => {
      const groupingError = 'Recovery query is missing columns: host.name';
      mockUseRecoveryQueryGroupingValidation.mockReturnValue({
        validationError: groupingError,
        missingColumns: ['host.name'],
        isValidating: false,
        queryColumns: [],
        queryError: undefined,
        recoveryColumns: [],
      });

      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: { condition: 'WHERE status < 200' } },
      });

      const error = result.current.conditionRules.validate('WHERE status < 200');

      expect(error).toBe(groupingError);
    });

    it('validate returns true when condition differs from evaluation', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: { condition: 'WHERE status < 200' } },
      });

      expect(result.current.conditionRules.validate('WHERE status < 200')).toBe(true);
    });

    it('validate returns true when only base is provided (no condition)', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-*' },
        },
      });

      expect(result.current.conditionRules.validate(undefined)).toBe(true);
    });

    it('validate checks "at least one" before differs-from-eval', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: { type: 'query', query: {} },
      });

      // Empty condition with no base — should get "at least one" error, not "differs" error
      const error = result.current.conditionRules.validate('   ');

      expect(typeof error).toBe('string');
      expect(error).toContain(
        'Either a recovery base query or recovery condition must be specified'
      );
    });
  });

  describe('watched values', () => {
    it('exposes watched form values', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*', condition: 'WHERE status > 500' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-*', condition: 'WHERE status < 200' },
        },
      });

      expect(result.current.evaluationBaseQuery).toBe('FROM logs-*');
      expect(result.current.evaluationCondition).toBe('WHERE status > 500');
      expect(result.current.recoveryBaseQuery).toBe('FROM metrics-*');
      expect(result.current.recoveryCondition).toBe('WHERE status < 200');
    });
  });
});
