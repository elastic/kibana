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
import type { useRecoveryValidation } from '../hooks/use_recovery_validation';

// Capture the latest props passed to WhereClauseEditor
let capturedWhereClauseProps: Record<string, unknown> | undefined;

jest.mock('./where_clause_editor', () => ({
  WhereClauseEditor: (props: Record<string, unknown>) => {
    capturedWhereClauseProps = props;
    return (
      <div data-test-subj={(props.dataTestSubj as string) ?? 'mockWhereClauseEditor'}>
        Where Clause Editor ({props.name as string})
      </div>
    );
  },
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
const FormRefCapture = () => {
  formRef = useFormContext<FormValues>();
  return null;
};

const createMockValidation = (
  overrides: Partial<ReturnType<typeof useRecoveryValidation>> = {}
): ReturnType<typeof useRecoveryValidation> => ({
  hasEvaluationCondition: true,
  effectiveBaseQuery: 'FROM logs | STATS count() BY host',
  assembledEvaluationQuery: 'FROM logs | STATS count() BY host | WHERE count > 100',
  assembledRecoveryQuery: '',
  recoveryMatchesEvaluation: false,
  evaluationBaseQuery: 'FROM logs | STATS count() BY host',
  evaluationCondition: 'WHERE count > 100',
  recoveryBaseQuery: undefined,
  recoveryCondition: undefined,
  groupingValidationError: undefined,
  fullBaseQueryRules: { required: 'Recovery query is required.', validate: () => true },
  splitBaseQueryRules: { validate: () => true },
  conditionRules: { validate: () => true },
  ...overrides,
});

describe('RecoveryBaseAndConditionField', () => {
  beforeEach(() => {
    capturedWhereClauseProps = undefined;
    capturedRecoveryBaseQueryFieldProps = undefined;
    formRef = undefined;
  });

  it('renders the WHERE clause editor targeting recoveryPolicy.query.condition', () => {
    const validation = createMockValidation();
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
        <RecoveryBaseAndConditionField validation={validation} />
      </Wrapper>
    );

    expect(screen.getByTestId('recoveryConditionWhereClause')).toBeInTheDocument();
    expect(
      screen.getByText('Where Clause Editor (recoveryPolicy.query.condition)')
    ).toBeInTheDocument();
  });

  describe('prop pass-through', () => {
    it('passes conditionRules to WhereClauseEditor', () => {
      const mockValidate = jest.fn(() => true as const);
      const validation = createMockValidation({
        conditionRules: { validate: mockValidate },
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      const rules = capturedWhereClauseProps?.rules as { validate?: Function };
      expect(rules?.validate).toBe(mockValidate);
    });

    it('passes effectiveBaseQuery to WhereClauseEditor as baseQuery', () => {
      const validation = createMockValidation({
        effectiveBaseQuery: 'FROM custom-index | STATS avg(val) BY key',
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      expect(capturedWhereClauseProps?.baseQuery).toBe('FROM custom-index | STATS avg(val) BY key');
    });

    it('passes splitBaseQueryRules to RecoveryBaseQueryField when base query is visible', async () => {
      const user = userEvent.setup();
      const mockValidate = jest.fn(() => true as const);
      const validation = createMockValidation({
        splitBaseQueryRules: { validate: mockValidate },
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      expect(capturedRecoveryBaseQueryFieldProps).toEqual(
        expect.objectContaining({
          dataTestSubj: 'recoveryBaseQueryField',
        })
      );
      const rules = capturedRecoveryBaseQueryFieldProps?.rules as { validate?: Function };
      expect(rules?.validate).toBe(mockValidate);
      expect(capturedRecoveryBaseQueryFieldProps?.labelTooltip).toBeDefined();
    });
  });

  describe('Add base recovery query button', () => {
    it('shows "+ Add base recovery query" button when no recovery base query is set', () => {
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      expect(screen.getByTestId('addRecoveryBaseQueryButton')).toBeInTheDocument();
      expect(screen.getByText('Add base recovery query')).toBeInTheDocument();
      expect(screen.queryByTestId('recoveryBaseQueryField')).not.toBeInTheDocument();
    });

    it('reveals the recovery base query editor when button is clicked', async () => {
      const user = userEvent.setup();
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();
      expect(screen.queryByTestId('addRecoveryBaseQueryButton')).not.toBeInTheDocument();
    });

    it('pre-fills the recovery base query with the evaluation query when button is clicked', async () => {
      const user = userEvent.setup();
      const evaluationBase = 'FROM logs | STATS count() BY host';
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBe(evaluationBase);
      });
    });

    it('shows the recovery base query editor immediately when form has a pre-filled recovery base query', () => {
      const validation = createMockValidation({
        recoveryBaseQuery: 'FROM logs | STATS count() BY host | WHERE count < 5',
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();
      expect(screen.queryByTestId('addRecoveryBaseQueryButton')).not.toBeInTheDocument();
    });

    it('shows remove button when base query editor is visible', () => {
      const validation = createMockValidation({
        recoveryBaseQuery: 'FROM logs | STATS count() BY host',
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      expect(screen.getByTestId('removeRecoveryBaseQueryButton')).toBeInTheDocument();
      expect(screen.getByText('Remove base recovery query')).toBeInTheDocument();
    });

    it('does not show remove button when base query editor is hidden', () => {
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      expect(screen.queryByTestId('removeRecoveryBaseQueryButton')).not.toBeInTheDocument();
    });

    it('clears the form value when remove button is clicked', async () => {
      const user = userEvent.setup();
      const validation = createMockValidation({
        recoveryBaseQuery: 'FROM logs | STATS count() BY host',
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      // Base query editor should be visible initially
      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();

      await user.click(screen.getByTestId('removeRecoveryBaseQueryButton'));

      // Form value should be cleared
      expect(formRef?.getValues('recoveryPolicy.query.base')).toBeUndefined();
    });

    it('hides the base query editor when remove is clicked and validation reflects removal', async () => {
      const user = userEvent.setup();
      // Start with add button visible so clicking add → remove cycle works
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      // Click add (shows editor)
      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));
      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();

      // Click remove (hides editor) — validation.recoveryBaseQuery is already undefined
      // so the useEffect won't re-show it
      await user.click(screen.getByTestId('removeRecoveryBaseQueryButton'));
      expect(screen.queryByTestId('recoveryBaseQueryField')).not.toBeInTheDocument();
      expect(screen.getByTestId('addRecoveryBaseQueryButton')).toBeInTheDocument();
    });

    it('allows re-adding the base query after removing it', async () => {
      const user = userEvent.setup();
      const evaluationBase = 'FROM logs | STATS count() BY host';
      // Start with no recovery base query so we can do a clean add → remove → re-add cycle
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      // Add, then remove
      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));
      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();

      await user.click(screen.getByTestId('removeRecoveryBaseQueryButton'));
      expect(screen.queryByTestId('recoveryBaseQueryField')).not.toBeInTheDocument();

      // Re-add — should pre-fill with evaluation base query
      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));
      expect(screen.getByTestId('recoveryBaseQueryField')).toBeInTheDocument();

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.base')).toBe(evaluationBase);
      });
    });
  });

  describe('condition seeding', () => {
    it('seeds the recovery condition with the evaluation condition on mount when empty', async () => {
      const validation = createMockValidation({
        evaluationCondition: 'WHERE count > 100',
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
          <FormRefCapture />
        </Wrapper>
      );

      await waitFor(() => {
        expect(formRef?.getValues('recoveryPolicy.query.condition')).toBe('WHERE count > 100');
      });
    });

    it('does not overwrite an existing recovery condition on mount', async () => {
      const validation = createMockValidation({
        evaluationCondition: 'WHERE count > 100',
      });
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
          <RecoveryBaseAndConditionField validation={validation} />
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

  describe('optional label', () => {
    it('does not mark the WHERE clause as optional when only the condition is shown', () => {
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      // Base query editor is not visible, so condition is required (isOptional = false)
      expect(capturedWhereClauseProps?.isOptional).toBe(false);
    });

    it('marks the WHERE clause as optional once the base query editor is shown', async () => {
      const user = userEvent.setup();
      const validation = createMockValidation();
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      // Initially not optional
      expect(capturedWhereClauseProps?.isOptional).toBe(false);

      // Add base query
      await user.click(screen.getByTestId('addRecoveryBaseQueryButton'));

      // Now condition is optional since the base query can fulfil the requirement
      expect(capturedWhereClauseProps?.isOptional).toBe(true);
    });

    it('marks the WHERE clause as optional when a pre-filled base query is present', () => {
      const validation = createMockValidation({
        recoveryBaseQuery: 'FROM logs | STATS max(count) BY host',
      });
      const Wrapper = createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: {
            base: 'FROM logs | STATS max(count) BY host',
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
          <RecoveryBaseAndConditionField validation={validation} />
        </Wrapper>
      );

      // Base query editor is visible due to pre-filled value, so condition is optional
      expect(capturedWhereClauseProps?.isOptional).toBe(true);
    });
  });
});
