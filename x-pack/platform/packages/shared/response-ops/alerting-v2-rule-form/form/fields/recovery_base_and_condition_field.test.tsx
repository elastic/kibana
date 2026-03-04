/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { RecoveryBaseAndConditionField } from './recovery_base_and_condition_field';
import { createFormWrapper } from '../../test_utils';
import type { FormValues } from '../types';

// Capture the latest props passed to WhereClauseEditor
let capturedWhereClauseRules:
  | { validate?: (value: string | undefined) => string | boolean }
  | undefined;
let capturedWhereClauseBaseQuery: string | undefined;

jest.mock('./where_clause_editor', () => ({
  WhereClauseEditor: (props: {
    dataTestSubj?: string;
    name: string;
    baseQuery?: string;
    rules?: { validate?: (value: string | undefined) => string | boolean };
  }) => {
    capturedWhereClauseRules = props.rules;
    capturedWhereClauseBaseQuery = props.baseQuery;
    return (
      <div data-test-subj={props.dataTestSubj ?? 'mockWhereClauseEditor'}>
        Where Clause Editor ({props.name})
      </div>
    );
  },
}));

// Mock useRecoveryQueryValidation for grouping validation
let mockGroupingValidationError: string | undefined;
jest.mock('../hooks/use_recovery_query_validation', () => ({
  useRecoveryQueryValidation: () => ({
    validationError: mockGroupingValidationError,
    missingColumns: [],
    isValidating: false,
    queryColumns: [],
    queryError: undefined,
    recoveryColumns: [],
  }),
}));

// Capture props passed to RecoveryBaseQueryField (used for the optional base query editor)
let capturedRecoveryBaseQueryFieldProps: Record<string, unknown> | undefined;
jest.mock('./recovery_base_query_field', () => ({
  RecoveryBaseQueryField: (props: Record<string, unknown>) => {
    capturedRecoveryBaseQueryFieldProps = props;
    return (
      <div data-test-subj={(props.dataTestSubj as string) ?? 'mockRecoveryBaseQueryField'}>
        Recovery Query Field
      </div>
    );
  },
}));

/**
 * Helper to capture the form instance so tests can call getValues() directly.
 */
let formRef: UseFormReturn<FormValues> | undefined;
const FormRefCapture: React.FC = () => {
  formRef = useFormContext<FormValues>();
  return null;
};

describe('RecoveryBaseAndConditionField', () => {
  beforeEach(() => {
    capturedWhereClauseRules = undefined;
    capturedWhereClauseBaseQuery = undefined;
    mockGroupingValidationError = undefined;
    capturedRecoveryBaseQueryFieldProps = undefined;
    formRef = undefined;
  });

  it('renders the WHERE clause editor targeting recoveryPolicy.query.condition', () => {
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
      evaluation: {
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count > 100',
        },
      },
    });

    render(
      <Wrapper>
        <RecoveryBaseAndConditionField />
      </Wrapper>
    );

    expect(screen.getByTestId('recoveryConditionWhereClause')).toBeInTheDocument();
    expect(
      screen.getByText('Where Clause Editor (recoveryPolicy.query.condition)')
    ).toBeInTheDocument();
  });

  describe('Add base recovery query button', () => {
    it('shows "+ Add base recovery query" button when no recovery base query is set', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(screen.getByTestId('addRecoveryBaseQueryButton')).toBeInTheDocument();
      expect(screen.getByText('Add base recovery query')).toBeInTheDocument();
      expect(screen.queryByTestId('recoveryBaseQueryField')).not.toBeInTheDocument();
    });

    it('reveals the recovery base query editor when button is clicked', async () => {
      const user = userEvent.setup();
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();
      expect(screen.queryByTestId('addRecoveryBaseQueryButton')).not.toBeInTheDocument();
    });

    it('pre-fills the recovery base query with the evaluation query when button is clicked', async () => {
      const user = userEvent.setup();
      const evaluationBase = 'FROM logs | STATS count() BY host';
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: evaluationBase,
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
          <FormRefCapture />
        </Wrapper>
      );

      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBe(evaluationBase);
      });
    });

    it('shows the recovery base query editor immediately when form has a pre-filled recovery base query', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: 'FROM logs | STATS count() BY host | WHERE count < 5',
            condition: 'WHERE count <= 50',
          },
        },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();
      expect(screen.queryByTestId('addRecoveryBaseQueryButton')).not.toBeInTheDocument();
    });

    it('shows remove button when base query editor is visible', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count <= 50',
          },
        },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(screen.getByTestId('removeRecoveryBaseQueryButton')).toBeInTheDocument();
      expect(screen.getByText('Remove base recovery query')).toBeInTheDocument();
    });

    it('does not show remove button when base query editor is hidden', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(screen.queryByTestId('removeRecoveryBaseQueryButton')).not.toBeInTheDocument();
    });

    it('hides the base query editor and clears the value when remove button is clicked', async () => {
      const user = userEvent.setup();
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count <= 50',
          },
        },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
          <FormRefCapture />
        </Wrapper>
      );

      // Base query editor should be visible initially
      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();

      await user.click(screen.getByTestId('removeRecoveryBaseQueryButton'));

      // Base query editor should be hidden and form value cleared
      expect(screen.queryByTestId('recoveryBaseQueryField')).not.toBeInTheDocument();
      expect(screen.getByTestId('addRecoveryBaseQueryButton')).toBeInTheDocument();
      expect(formRef?.getValues('recoveryPolicy.query.base')).toBeUndefined();
    });

    it('allows re-adding the base query after removing it', async () => {
      const user = userEvent.setup();
      const evaluationBase = 'FROM logs | STATS count() BY host';
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: 'FROM custom | STATS avg(val) BY key',
            condition: 'WHERE count <= 50',
          },
        },
        evaluation: {
          query: {
            base: evaluationBase,
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
          <FormRefCapture />
        </Wrapper>
      );

      // Remove the base query
      await user.click(screen.getByTestId('removeRecoveryBaseQueryButton'));
      expect(screen.queryByTestId('recoveryBaseQueryField')).not.toBeInTheDocument();

      // Re-add it — should pre-fill with evaluation base query
      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));
      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBe(evaluationBase);
      });
    });

    it('passes correct props to RecoveryBaseQueryField for the base query editor', async () => {
      const user = userEvent.setup();
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      expect(capturedRecoveryBaseQueryFieldProps).toEqual(
        expect.objectContaining({
          required: false,
          seedFromEvaluation: false,
          validateGrouping: false,
          dataTestSubj: 'recoveryBaseQueryField',
        })
      );
      expect(capturedRecoveryBaseQueryFieldProps?.labelTooltip).toBeDefined();
    });
  });

  describe('baseQuery resolution', () => {
    it('passes evaluation base query to WhereClauseEditor when no recovery base query is set', () => {
      const evaluationBase = 'FROM logs | STATS count() BY host';
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: evaluationBase,
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(capturedWhereClauseBaseQuery).toBe(evaluationBase);
    });

    it('passes recovery base query to WhereClauseEditor when it is defined', () => {
      const recoveryBase = 'FROM logs | STATS max(count) BY host';
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: recoveryBase,
            condition: 'WHERE max_count <= 50',
          },
        },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(capturedWhereClauseBaseQuery).toBe(recoveryBase);
    });

    it('falls back to evaluation base query when recovery base query is only whitespace', () => {
      const evaluationBase = 'FROM logs | STATS count() BY host';
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: '   ',
            condition: 'WHERE count <= 50',
          },
        },
        evaluation: {
          query: {
            base: evaluationBase,
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(capturedWhereClauseBaseQuery).toBe(evaluationBase);
    });
  });

  describe('condition seeding', () => {
    it('seeds the recovery condition with the evaluation condition on mount when empty', async () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
          <FormRefCapture />
        </Wrapper>
      );

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.condition')).toBe('WHERE count > 100');
      });
    });

    it('does not overwrite an existing recovery condition on mount', async () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: { condition: 'WHERE status != "error"' },
        },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
          <FormRefCapture />
        </Wrapper>
      );

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.condition')).toBe(
          'WHERE status != "error"'
        );
      });
    });
  });

  describe('validation', () => {
    it('passes a validate rule to the WHERE clause editor', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      expect(capturedWhereClauseRules).toBeDefined();
      expect(capturedWhereClauseRules?.validate).toBeInstanceOf(Function);
    });

    it('returns an error when recovery condition matches the evaluation condition exactly', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('WHERE count > 100');
      expect(result).toBe(
        'Recovery condition must differ from the evaluation condition. The same condition would never recover.'
      );
    });

    it('returns an error when conditions match with different casing', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('WHERE COUNT > 100');
      expect(result).toBe(
        'Recovery condition must differ from the evaluation condition. The same condition would never recover.'
      );
    });

    it('returns an error when conditions match with extra whitespace', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('  WHERE count > 100  ');
      expect(result).toBe(
        'Recovery condition must differ from the evaluation condition. The same condition would never recover.'
      );
    });

    it('passes validation when recovery condition differs from evaluation condition', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('WHERE count <= 50');
      expect(result).toBe(true);
    });

    it('returns an error when both recovery condition and base query are empty', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.(undefined);
      expect(result).toBe('Either a recovery base query or recovery condition must be specified.');
    });

    it('passes validation when condition is empty but recovery base query is provided', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM logs | STATS max(count) BY host' },
        },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.(undefined);
      expect(result).toBe(true);
    });

    it('passes validation when condition is provided but no recovery base query', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('WHERE count <= 50');
      expect(result).toBe(true);
    });

    it('returns grouping validation error when grouping fields are missing from recovery query', () => {
      mockGroupingValidationError =
        'Recovery query is missing columns used for grouping: host. The recovery query must include these columns to properly identify which alerts should recover.';

      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('WHERE count <= 50');
      expect(result).toBe(mockGroupingValidationError);
    });

    it('passes validation when there is no grouping validation error', () => {
      mockGroupingValidationError = undefined;

      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: {
          query: {
            base: 'FROM logs | STATS count() BY host',
            condition: 'WHERE count > 100',
          },
        },
      });

      render(
        <Wrapper>
          <RecoveryBaseAndConditionField />
        </Wrapper>
      );

      const result = capturedWhereClauseRules?.validate?.('WHERE count <= 50');
      expect(result).toBe(true);
    });
  });
});
