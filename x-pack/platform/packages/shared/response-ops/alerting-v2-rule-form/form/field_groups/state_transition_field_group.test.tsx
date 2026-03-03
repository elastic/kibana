/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StateTransitionFieldGroup } from './state_transition_field_group';
import { createFormWrapper } from '../../test_utils';

describe('StateTransitionFieldGroup', () => {
  it('renders when kind is "alert"', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('State transition')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toBeInTheDocument();
  });

  it('does not render when kind is "signal"', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'signal' }),
    });

    expect(screen.queryByText('State transition')).not.toBeInTheDocument();
  });

  it('renders the consecutive breaches count input', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Consecutive breaches')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
  });

  it('renders the breached-for-duration timeframe input', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Breached for duration')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toBeInTheDocument();
  });

  it('keeps state transition timeframe empty by default', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId(
      'stateTransitionTimeframeNumberInput'
    ) as HTMLInputElement;
    expect(numberInput.value).toBe('');
  });

  it('accepts a positive integer for count', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const input = screen.getByTestId('stateTransitionCountInput');
    fireEvent.change(input, { target: { value: '3' } });
    expect(input).toHaveValue(3);
  });

  it('accepts a positive number and unit for state transition timeframe', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingTimeframe: '10m' },
      }),
    });

    const numberInput = screen.getByTestId('stateTransitionTimeframeNumberInput');
    expect(numberInput).toHaveValue(10);

    const unitSelect = screen.getByTestId('stateTransitionTimeframeUnitInput');
    expect(unitSelect).toHaveValue('m');
  });

  it('updates state transition timeframe unit when changed', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingTimeframe: '5m' },
      }),
    });

    const unitSelect = screen.getByTestId('stateTransitionTimeframeUnitInput');
    fireEvent.change(unitSelect, { target: { value: 'h' } });
    expect(unitSelect).toHaveValue('h');
  });

  it('does not auto-populate state transition timeframe number when only unit changes', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId(
      'stateTransitionTimeframeNumberInput'
    ) as HTMLInputElement;
    const unitSelect = screen.getByTestId('stateTransitionTimeframeUnitInput');

    fireEvent.change(unitSelect, { target: { value: 'h' } });

    expect(unitSelect).toHaveValue('h');
    expect(numberInput.value).toBe('');
  });

  it('renders with pre-filled state transition values from form state', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: {
          pendingCount: 5,
          pendingTimeframe: '15m',
        },
      }),
    });

    expect(screen.getByTestId('stateTransitionCountInput')).toHaveValue(5);
    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toHaveValue(15);
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toHaveValue('m');
  });
});
