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

  describe('recoveryMatchesEvaluation', () => {
    it('is true when base queries are identical', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
        recoveryPolicy: { type: 'query', query: { base: 'FROM logs-*' } },
      });

      expect(result.current.recoveryMatchesEvaluation).toBe(true);
    });

    it('is true when base queries match case-insensitively', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
        recoveryPolicy: { type: 'query', query: { base: 'from logs-*' } },
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

  describe('grouping validation', () => {
    it('passes recovery base query to useRecoveryQueryGroupingValidation', () => {
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

  describe('fullBaseQueryRules', () => {
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

  describe('watched values', () => {
    it('exposes watched form values', () => {
      const { result } = renderValidationHook({
        evaluation: { query: { base: 'FROM logs-*' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-*' },
        },
      });

      expect(result.current.evaluationBaseQuery).toBe('FROM logs-*');
      expect(result.current.recoveryBaseQuery).toBe('FROM metrics-*');
    });
  });
});
