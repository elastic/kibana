/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecoveryBaseQueryOnlyField } from './recovery_base_query_only_field';
import { createFormWrapper } from '../../test_utils';

// Capture the additionalValidation prop passed to RecoveryBaseQueryField
let capturedAdditionalValidation:
  | ((value: string | undefined) => string | true | undefined)
  | undefined;

jest.mock('./recovery_base_query_field', () => ({
  RecoveryBaseQueryField: (props: {
    additionalValidation?: (value: string | undefined) => string | true | undefined;
  }) => {
    capturedAdditionalValidation = props.additionalValidation;
    return <div data-test-subj="mockRecoveryBaseQueryField">Recovery Base Query Field</div>;
  },
}));

describe('RecoveryBaseQueryOnlyField', () => {
  beforeEach(() => {
    capturedAdditionalValidation = undefined;
  });

  it('renders RecoveryBaseQueryField', () => {
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
      evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
    });

    render(
      <Wrapper>
        <RecoveryBaseQueryOnlyField />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryBaseQueryField')).toBeInTheDocument();
  });

  it('passes additionalValidation to RecoveryBaseQueryField', () => {
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
      evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
    });

    render(
      <Wrapper>
        <RecoveryBaseQueryOnlyField />
      </Wrapper>
    );

    expect(capturedAdditionalValidation).toBeInstanceOf(Function);
  });

  describe('validation: recovery query must differ from evaluation query', () => {
    it('returns error when recovery query matches the full evaluation query (base only)', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField />
        </Wrapper>
      );

      const result = capturedAdditionalValidation?.('FROM logs | STATS count() BY host');
      expect(result).toBe(
        'Recovery query must differ from the evaluation query. The same query would never recover.'
      );
    });

    it('returns error when queries match with different casing', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField />
        </Wrapper>
      );

      const result = capturedAdditionalValidation?.('from logs | stats count() by host');
      expect(result).toBe(
        'Recovery query must differ from the evaluation query. The same query would never recover.'
      );
    });

    it('returns error when queries match with extra whitespace', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField />
        </Wrapper>
      );

      const result = capturedAdditionalValidation?.('  FROM logs | STATS count() BY host  ');
      expect(result).toBe(
        'Recovery query must differ from the evaluation query. The same query would never recover.'
      );
    });

    it('passes validation when recovery query differs from evaluation query', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField />
        </Wrapper>
      );

      const result = capturedAdditionalValidation?.(
        'FROM logs | STATS count() BY host | WHERE count < 5'
      );
      expect(result).toBe(true);
    });

    it('passes validation when recovery query is empty', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField />
        </Wrapper>
      );

      const result = capturedAdditionalValidation?.(undefined);
      expect(result).toBe(true);
    });

    it('passes validation when evaluation query is empty', () => {
      const Wrapper = createFormWrapper({
        recoveryPolicy: { type: 'query' },
        evaluation: { query: { base: '' } },
      });

      render(
        <Wrapper>
          <RecoveryBaseQueryOnlyField />
        </Wrapper>
      );

      const result = capturedAdditionalValidation?.('FROM logs | STATS count() BY host');
      expect(result).toBe(true);
    });
  });
});
