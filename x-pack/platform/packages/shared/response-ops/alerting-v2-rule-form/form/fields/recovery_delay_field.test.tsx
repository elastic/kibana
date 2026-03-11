/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryDelayField } from './recovery_delay_field';
import { createFormWrapper } from '../../test_utils';

describe('RecoveryDelayField', () => {
  it('renders the recovery delay form row', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('recoveryDelayFormRow')).toBeInTheDocument();
  });

  it('renders with label "Recovery delay"', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Recovery delay')).toBeInTheDocument();
  });

  it('defaults to immediate mode', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('recoveryDelayImmediateDescription')).toBeInTheDocument();
    expect(screen.getByText('No delay - Recovers on first non-breach')).toBeInTheDocument();
  });

  it('derives breaches mode from form state with recoveringCount', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { recoveringCount: 4 },
      }),
    });

    expect(screen.getByTestId('recoveryTransitionCountInput')).toBeInTheDocument();
  });

  it('derives duration mode from form state with recoveringTimeframe', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { recoveringTimeframe: '20m' },
      }),
    });

    expect(screen.getByTestId('recoveryTransitionTimeframeNumberInput')).toBeInTheDocument();
  });

  it('switches to breaches mode when Breaches button is clicked', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByText('Breaches'));

    expect(screen.getByTestId('recoveryTransitionCountInput')).toBeInTheDocument();
    expect(screen.queryByTestId('recoveryDelayImmediateDescription')).not.toBeInTheDocument();
  });

  it('switches to duration mode when Duration button is clicked', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByText('Duration'));

    expect(screen.getByTestId('recoveryTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.queryByTestId('recoveryDelayImmediateDescription')).not.toBeInTheDocument();
  });

  it('switches back to immediate mode', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { recoveringCount: 4 },
      }),
    });

    // Start in breaches mode, switch to immediate
    fireEvent.click(screen.getByText('Immediate'));

    expect(screen.getByTestId('recoveryDelayImmediateDescription')).toBeInTheDocument();
    expect(screen.queryByTestId('recoveryTransitionCountInput')).not.toBeInTheDocument();
  });

  it('renders the mode toggle button group', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('recoveryDelayMode')).toBeInTheDocument();
  });
});
