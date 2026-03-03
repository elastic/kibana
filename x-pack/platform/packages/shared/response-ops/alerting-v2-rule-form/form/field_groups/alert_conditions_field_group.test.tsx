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

jest.mock('../fields/recovery_query_field', () => ({
  RecoveryQueryField: () => <div data-test-subj="mockRecoveryQueryField">Recovery Query Field</div>,
}));

describe('AlertConditionsFieldGroup', () => {
  it('renders the field group with title', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Alert conditions')).toBeInTheDocument();
  });

  it('renders the recovery type field', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryTypeField')).toBeInTheDocument();
  });

  it('does not render recovery query field when type is no_breach', () => {
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'no_breach' },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.queryByTestId('mockRecoveryQueryField')).not.toBeInTheDocument();
  });

  it('renders recovery query field when type is query', () => {
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryQueryField')).toBeInTheDocument();
  });

  it('always renders recovery type field regardless of type', () => {
    const Wrapper = createFormWrapper({
      recoveryPolicy: { type: 'query' },
    });

    render(
      <Wrapper>
        <AlertConditionsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockRecoveryTypeField')).toBeInTheDocument();
    expect(screen.getByTestId('mockRecoveryQueryField')).toBeInTheDocument();
  });
});
