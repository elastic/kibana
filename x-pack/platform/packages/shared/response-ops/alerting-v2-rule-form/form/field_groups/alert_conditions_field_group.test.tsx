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
});
