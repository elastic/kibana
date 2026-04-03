/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StateTransitionTimeframeField } from './state_transition_timeframe_field';
import { createFormWrapper, createMockServices } from '../../test_utils';

describe('StateTransitionTimeframeField', () => {
  it('renders the breached-for-duration timeframe input', () => {
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toBeInTheDocument();
  });

  it('defaults state transition timeframe to 2 minutes', () => {
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId(
      'stateTransitionTimeframeNumberInput'
    ) as HTMLInputElement;
    expect(numberInput.value).toBe('2');

    const unitSelect = screen.getByTestId('stateTransitionTimeframeUnitInput');
    expect(unitSelect).toHaveValue('m');
  });

  it('accepts a positive number and unit for state transition timeframe', () => {
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
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
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingTimeframe: '5m' },
      }),
    });

    const unitSelect = screen.getByTestId('stateTransitionTimeframeUnitInput');
    fireEvent.change(unitSelect, { target: { value: 'h' } });
    expect(unitSelect).toHaveValue('h');
  });

  it('keeps default number when only unit changes', () => {
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    const numberInput = screen.getByTestId(
      'stateTransitionTimeframeNumberInput'
    ) as HTMLInputElement;
    const unitSelect = screen.getByTestId('stateTransitionTimeframeUnitInput');

    fireEvent.change(unitSelect, { target: { value: 'h' } });

    expect(unitSelect).toHaveValue('h');
    expect(numberInput.value).toBe('2');
  });

  it('renders with pre-filled state transition timeframe from form state', () => {
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
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

  it('renders correctly in flyout layout', () => {
    render(<StateTransitionTimeframeField numberPrependLabel="Active for" />, {
      wrapper: createFormWrapper({ kind: 'alert' }, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toBeInTheDocument();
  });

  describe('variant="recovering"', () => {
    it('renders with the recovering test subjects', () => {
      render(<StateTransitionTimeframeField variant="recovering" />, {
        wrapper: createFormWrapper({ kind: 'alert' }),
      });

      expect(screen.getByTestId('recoveryTransitionTimeframeNumberInput')).toBeInTheDocument();
      expect(screen.getByTestId('recoveryTransitionTimeframeUnitInput')).toBeInTheDocument();
    });

    it('defaults recovering timeframe to 2 minutes', () => {
      render(<StateTransitionTimeframeField variant="recovering" />, {
        wrapper: createFormWrapper({ kind: 'alert' }),
      });

      const numberInput = screen.getByTestId(
        'recoveryTransitionTimeframeNumberInput'
      ) as HTMLInputElement;
      expect(numberInput.value).toBe('2');

      const unitSelect = screen.getByTestId('recoveryTransitionTimeframeUnitInput');
      expect(unitSelect).toHaveValue('m');
    });

    it('renders with pre-filled recovering timeframe from form state', () => {
      render(<StateTransitionTimeframeField variant="recovering" />, {
        wrapper: createFormWrapper({
          kind: 'alert',
          stateTransition: {
            recoveringTimeframe: '30m',
          },
        }),
      });

      expect(screen.getByTestId('recoveryTransitionTimeframeNumberInput')).toHaveValue(30);
      expect(screen.getByTestId('recoveryTransitionTimeframeUnitInput')).toHaveValue('m');
    });

    it('updates recovering timeframe unit when changed', () => {
      render(<StateTransitionTimeframeField variant="recovering" />, {
        wrapper: createFormWrapper({
          kind: 'alert',
          stateTransition: { recoveringTimeframe: '5m' },
        }),
      });

      const unitSelect = screen.getByTestId('recoveryTransitionTimeframeUnitInput');
      fireEvent.change(unitSelect, { target: { value: 'h' } });
      expect(unitSelect).toHaveValue('h');
    });
  });
});
