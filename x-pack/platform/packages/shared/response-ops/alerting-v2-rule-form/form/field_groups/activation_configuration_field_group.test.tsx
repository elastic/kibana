/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivationConfigurationFieldGroup } from './activation_configuration_field_group';
import { createFormWrapper } from '../../test_utils';

describe('ActivationConfigurationFieldGroup', () => {
  it('renders when kind is "alert"', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Activation configuration')).toBeInTheDocument();
    expect(screen.getByTestId('activationCountInput')).toBeInTheDocument();
    expect(screen.getByTestId('activationTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('activationTimeframeUnitInput')).toBeInTheDocument();
  });

  it('does not render when kind is "signal"', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'signal' }),
    });

    expect(screen.queryByText('Activation configuration')).not.toBeInTheDocument();
  });

  it('renders the consecutive breaches count input', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Consecutive breaches')).toBeInTheDocument();
    expect(screen.getByTestId('activationCountInput')).toBeInTheDocument();
  });

  it('renders the breached-for-duration timeframe input', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Breached for duration')).toBeInTheDocument();
    expect(screen.getByTestId('activationTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('activationTimeframeUnitInput')).toBeInTheDocument();
  });

  it('keeps activation timeframe empty by default', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId('activationTimeframeNumberInput') as HTMLInputElement;
    expect(numberInput.value).toBe('');
  });

  it('accepts a positive integer for count', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const input = screen.getByTestId('activationCountInput');
    fireEvent.change(input, { target: { value: '3' } });
    expect(input).toHaveValue(3);
  });

  it('accepts a positive number and unit for timeframe', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingTimeframe: '10m' },
      }),
    });

    const numberInput = screen.getByTestId('activationTimeframeNumberInput');
    expect(numberInput).toHaveValue(10);

    const unitSelect = screen.getByTestId('activationTimeframeUnitInput');
    expect(unitSelect).toHaveValue('m');
  });

  it('updates timeframe unit when changed', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingTimeframe: '5m' },
      }),
    });

    const unitSelect = screen.getByTestId('activationTimeframeUnitInput');
    fireEvent.change(unitSelect, { target: { value: 'h' } });
    expect(unitSelect).toHaveValue('h');
  });

  it('does not auto-populate timeframe number when only unit changes', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId('activationTimeframeNumberInput') as HTMLInputElement;
    const unitSelect = screen.getByTestId('activationTimeframeUnitInput');

    fireEvent.change(unitSelect, { target: { value: 'h' } });

    expect(unitSelect).toHaveValue('h');
    expect(numberInput.value).toBe('');
  });

  it('renders with pre-filled values from form state', () => {
    render(<ActivationConfigurationFieldGroup />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: {
          pendingCount: 5,
          pendingTimeframe: '15m',
        },
      }),
    });

    expect(screen.getByTestId('activationCountInput')).toHaveValue(5);
    expect(screen.getByTestId('activationTimeframeNumberInput')).toHaveValue(15);
    expect(screen.getByTestId('activationTimeframeUnitInput')).toHaveValue('m');
  });
});
