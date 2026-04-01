/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertConditionsFieldGroup } from './alert_conditions_field_group';
import { createFormWrapper } from '../../test_utils';

// Mock the child field components
jest.mock('../fields/recovery_type_field', () => ({
  RecoveryTypeField: () => <div data-test-subj="mockRecoveryTypeField">Recovery Type Field</div>,
}));

jest.mock('../fields/recovery_base_query_only_field', () => ({
  RecoveryBaseQueryOnlyField: () => (
    <div data-test-subj="mockRecoveryBaseQueryOnlyField">Recovery Base Query Only Field</div>
  ),
}));

jest.mock('../fields/recovery_base_and_condition_field', () => ({
  RecoveryBaseAndConditionField: () => (
    <div data-test-subj="mockRecoveryBaseAndConditionField">Recovery Condition Field</div>
  ),
}));

jest.mock('../fields/alert_delay_field', () => ({
  AlertDelayField: () => <div data-test-subj="mockAlertDelayField">Alert Delay Field</div>,
}));

jest.mock('../fields/recovery_delay_field', () => ({
  RecoveryDelayField: () => <div data-test-subj="mockRecoveryDelayField">Recovery Delay Field</div>,
}));

describe('AlertConditionsFieldGroup', () => {
  it('renders the field group with title when kind is alert', () => {
    const Wrapper = createFormWrapper({ kind: 'alert' });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Alert conditions')).toBeInTheDocument();
  });

  it('does not render when kind is signal', () => {
    const Wrapper = createFormWrapper({ kind: 'signal' });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.queryByText('Alert conditions')).not.toBeInTheDocument();
  });

  it('renders the alert delay field', () => {
    const Wrapper = createFormWrapper({ kind: 'alert' });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockAlertDelayField')).toBeInTheDocument();
  });

  it('renders the recovery delay field', () => {
    const Wrapper = createFormWrapper({ kind: 'alert' });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryDelayField')).toBeInTheDocument();
  });

  it('renders the recovery type field', () => {
    const Wrapper = createFormWrapper({ kind: 'alert' });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryTypeField')).toBeInTheDocument();
  });

  it('does not render recovery fields when type is no_breach', () => {
    const Wrapper = createFormWrapper({
      kind: 'alert',
      recoveryPolicy: { type: 'no_breach' },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.queryByTestId('mockRecoveryBaseQueryOnlyField')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockRecoveryBaseAndConditionField')).not.toBeInTheDocument();
  });

  it('renders RecoveryBaseQueryOnlyField when type is query and no evaluation condition exists', () => {
    const Wrapper = createFormWrapper({
      kind: 'alert',
      recoveryPolicy: { type: 'query' },
      evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryBaseQueryOnlyField')).toBeInTheDocument();
    expect(screen.queryByTestId('mockRecoveryBaseAndConditionField')).not.toBeInTheDocument();
  });

  it('renders RecoveryBaseAndConditionField when type is query and evaluation condition exists', () => {
    const Wrapper = createFormWrapper({
      kind: 'alert',
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
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryBaseAndConditionField')).toBeInTheDocument();
    expect(screen.queryByTestId('mockRecoveryBaseQueryOnlyField')).not.toBeInTheDocument();
  });

  it('always renders recovery type field regardless of type', () => {
    const Wrapper = createFormWrapper({
      kind: 'alert',
      recoveryPolicy: { type: 'query' },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryTypeField')).toBeInTheDocument();
  });

  it('falls back to RecoveryBaseQueryOnlyField when evaluation condition is only whitespace', () => {
    const Wrapper = createFormWrapper({
      kind: 'alert',
      recoveryPolicy: { type: 'query' },
      evaluation: {
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: '   ',
        },
      },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryBaseQueryOnlyField')).toBeInTheDocument();
    expect(screen.queryByTestId('mockRecoveryBaseAndConditionField')).not.toBeInTheDocument();
  });
});
