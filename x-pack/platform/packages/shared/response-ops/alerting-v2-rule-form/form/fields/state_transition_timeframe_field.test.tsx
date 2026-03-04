/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StateTransitionTimeframeField } from './state_transition_timeframe_field';
import { createFormWrapper } from '../../test_utils';

describe('StateTransitionTimeframeField', () => {
  it('renders the breached-for-duration timeframe input', () => {
    render(<StateTransitionTimeframeField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toBeInTheDocument();
  });

  it('keeps state transition timeframe empty by default', () => {
    render(<StateTransitionTimeframeField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId(
      'stateTransitionTimeframeNumberInput'
    ) as HTMLInputElement;
    expect(numberInput.value).toBe('');
  });

  it('accepts a positive number and unit for state transition timeframe', () => {
    render(<StateTransitionTimeframeField />, {
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
    render(<StateTransitionTimeframeField />, {
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
    render(<StateTransitionTimeframeField />, {
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

  it('renders with pre-filled state transition timeframe from form state', () => {
    render(<StateTransitionTimeframeField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: {
          pendingTimeframe: '15m',
        },
      }),
    });

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toHaveValue(15);
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toHaveValue('m');
  });
});
