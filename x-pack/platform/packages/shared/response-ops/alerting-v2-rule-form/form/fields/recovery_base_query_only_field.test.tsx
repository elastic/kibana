/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { RecoveryBaseQueryOnlyField } from './recovery_base_query_only_field';
import { createFormWrapper } from '../../test_utils';
import type { FormValues } from '../types';
import type { useRecoveryValidation } from '../hooks/use_recovery_validation';

// Capture props passed to RecoveryBaseQueryField
let capturedRules:
  | { required?: string; validate?: (value: string | undefined) => string | boolean }
  | undefined;
let capturedErrors: Error[] | undefined;

jest.mock('./recovery_base_query_field', () => ({
  RecoveryBaseQueryField: (props: {
    rules?: { required?: string; validate?: (value: string | undefined) => string | boolean };
    errors?: Error[];
  }) => {
    capturedRules = props.rules;
    capturedErrors = props.errors;
    return <div data-test-subj="mockRecoveryBaseQueryField">Recovery Base Query Field</div>;
  },
}));

/**
 * Helper to capture the form instance so tests can call getValues() directly.
 */
let formRef: UseFormReturn<FormValues> | undefined;
const FormRefCapture = () => {
  formRef = useFormContext<FormValues>();
  return null;
};

const createMockValidation = (
  overrides: Partial<ReturnType<typeof useRecoveryValidation>> = {}
): ReturnType<typeof useRecoveryValidation> => ({
  hasEvaluationCondition: false,
  effectiveBaseQuery: '',
  assembledEvaluationQuery: 'FROM logs | STATS count() BY host',
  assembledRecoveryQuery: '',
  recoveryMatchesEvaluation: false,
  evaluationBaseQuery: 'FROM logs | STATS count() BY host',
  evaluationCondition: undefined,
  recoveryBaseQuery: undefined,
  recoveryCondition: undefined,
  groupingValidationError: undefined,
  fullBaseQueryRules: {
    required: 'Recovery query is required when using a custom recovery condition.',
    validate: () => true,
  },
  splitBaseQueryRules: { validate: () => true },
  conditionRules: { validate: () => true },
  ...overrides,
});

describe('RecoveryBaseQueryOnlyField', () => {
  beforeEach(() => {
    capturedRules = undefined;
    capturedErrors = undefined;
    formRef = undefined;
  });

  it('renders RecoveryBaseQueryField', () => {
    const validation = createMockValidation();
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
      evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
    });

    render(
      <Wrapper>
        <RecoveryBaseQueryOnlyField validation={validation} />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryBaseQueryField')).toBeInTheDocument();
  });

  it('passes fullBaseQueryRules as rules to RecoveryBaseQueryField', () => {
    const mockValidate = jest.fn(() => true as const);
    const validation = createMockValidation({
      fullBaseQueryRules: {
        required: 'Recovery query is required.',
        validate: mockValidate,
      },
    });
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
      evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
    });

    render(
      <Wrapper>
        <RecoveryBaseQueryOnlyField validation={validation} />
      </Wrapper>
    );

    expect(capturedRules).toBeDefined();
    expect(capturedRules?.required).toBe('Recovery query is required.');
    expect(capturedRules?.validate).toBe(mockValidate);
  });

  describe('grouping errors', () => {
    it('passes undefined errors when no grouping validation error exists', () => {
      const validation = createMockValidation({ groupingValidationError: undefined });
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField validation={validation} />
        </Wrapper>
      );

      expect(capturedErrors).toBeUndefined();
    });

    it('wraps grouping validation error in Error array and passes as errors', () => {
      const validation = createMockValidation({
        groupingValidationError: 'Recovery query is missing columns used for grouping: host.name',
      });
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField validation={validation} />
        </Wrapper>
      );

      expect(capturedErrors).toHaveLength(1);
      expect(capturedErrors![0]).toBeInstanceOf(Error);
      expect(capturedErrors![0].message).toBe(
        'Recovery query is missing columns used for grouping: host.name'
      );
    });
  });

  describe('seeding', () => {
    it('seeds recovery query from evaluation query on mount when empty', async () => {
      const validation = createMockValidation();
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBe(
          'FROM logs | STATS count() BY host'
        );
      });
    });

    it('does not overwrite an existing recovery query on mount', async () => {
      const validation = createMockValidation();
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-* | WHERE status == "ok"' },
        },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBe(
          'FROM metrics-* | WHERE status == "ok"'
        );
      });
    });

    it('does not seed when evaluation query is empty', async () => {
      const validation = createMockValidation();
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: '' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBeFalsy();
      });
    });
  });
});
