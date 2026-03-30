/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertDelayField } from './alert_delay_field';
import { createFormWrapper } from '../../test_utils';

describe('AlertDelayField', () => {
  it('renders the alert delay form row', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('alertDelayFormRow')).toBeInTheDocument();
  });

  it('renders with label "Alert delay"', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Alert delay')).toBeInTheDocument();
  });

  it('defaults to immediate mode', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('stateTransitionImmediateDescription')).toBeInTheDocument();
    expect(screen.getByText('No delay - Alerts on first breach')).toBeInTheDocument();
  });

  it('derives breaches mode from form state with pendingCount', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingCount: 3 },
      }),
    });

    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
  });

  it('derives duration mode from form state with pendingTimeframe', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingTimeframe: '10m' },
      }),
    });

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
  });

  it('switches to breaches mode when Breaches button is clicked', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByText('Breaches'));

    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionImmediateDescription')).not.toBeInTheDocument();
  });

  it('switches to duration mode when Duration button is clicked', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByText('Duration'));

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionImmediateDescription')).not.toBeInTheDocument();
  });

  it('switches back to immediate mode', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: { pendingCount: 3 },
      }),
    });

    // Start in breaches mode, switch to immediate
    fireEvent.click(screen.getByText('Immediate'));

    expect(screen.getByTestId('stateTransitionImmediateDescription')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionCountInput')).not.toBeInTheDocument();
  });

  it('renders the mode toggle button group', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('stateTransitionDelayMode')).toBeInTheDocument();
  });
});
