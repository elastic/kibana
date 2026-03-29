/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LookbackWindowField } from './lookback_window_field';
import { createFormWrapper } from '../../test_utils';

describe('LookbackWindowField', () => {
  it('renders the lookback window label', () => {
    render(<LookbackWindowField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Lookback Window')).toBeInTheDocument();
  });

  it('displays the initial lookback value', () => {
    render(<LookbackWindowField />, {
      wrapper: createFormWrapper({
        schedule: { every: '5m', lookback: '10m' },
      }),
    });

    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('renders the "Last" prepend label', () => {
    render(<LookbackWindowField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Last')).toBeInTheDocument();
  });

  it('renders the correct data-test-subj attributes', () => {
    render(<LookbackWindowField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('lookbackWindow')).toBeInTheDocument();
    expect(screen.getByTestId('lookbackWindowNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('lookbackWindowUnitInput')).toBeInTheDocument();
  });

  it('allows clearing the number input and typing a new value', () => {
    render(<LookbackWindowField />, {
      wrapper: createFormWrapper({
        schedule: { every: '5m', lookback: '10m' },
      }),
    });

    const input = screen.getByTestId('lookbackWindowNumberInput');

    // Clear the field
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);

    // Type a new value
    fireEvent.change(input, { target: { value: '3' } });
    expect(input).toHaveValue(3);
  });

  it('restores the last valid value on blur when the field is empty', () => {
    render(<LookbackWindowField />, {
      wrapper: createFormWrapper({
        schedule: { every: '5m', lookback: '10m' },
      }),
    });

    const input = screen.getByTestId('lookbackWindowNumberInput');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input).toHaveValue(10);
  });
});
