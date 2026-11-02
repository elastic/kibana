/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RuleFormCircuitBreakerError } from './rule_form_circuit_breaker_error';
import { CIRCUIT_BREAKER_SEE_FULL_ERROR_TEXT } from '../translations';

describe('RuleFormCircuitBreakerError', () => {
  test('renders correctly', () => {
    render(<RuleFormCircuitBreakerError />);

    expect(screen.getByText(CIRCUIT_BREAKER_SEE_FULL_ERROR_TEXT)).toBeInTheDocument();
  });

  test('can toggle details', () => {
    render(
      <RuleFormCircuitBreakerError>
        <div>child component</div>
      </RuleFormCircuitBreakerError>
    );

    fireEvent.click(screen.getByTestId('ruleFormCircuitBreakerErrorToggleButton'));

    expect(screen.getByText('child component')).toBeInTheDocument();
  });
});
