/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import { AlertDelayField } from './alert_delay_field';
import { RecoveryDelayField } from './recovery_delay_field';
import type { FormValues } from '../types';
import { mapFormValuesToUpdateRequest } from '../utils/rule_request_mappers';
import { createFormWrapper, createMockServices } from '../../test_utils';

let getFormValues: (() => FormValues) | undefined;

const CaptureFormGetValues = () => {
  getFormValues = useFormContext<FormValues>().getValues;
  return null;
};

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

  it('shows breaches controls when alert delay mode is breaches', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransitionAlertDelayMode: 'breaches',
        stateTransition: { pendingCount: 3 },
      }),
    });

    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
  });

  it('shows duration controls when alert delay mode is duration', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransitionAlertDelayMode: 'duration',
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
        stateTransitionAlertDelayMode: 'breaches',
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

  it('renders correctly in flyout layout', () => {
    render(<AlertDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByTestId('stateTransitionDelayMode')).toBeInTheDocument();
  });

  it('uses default count when switching from immediate (pendingCount: 0) to breaches', () => {
    getFormValues = undefined;
    render(
      <>
        <CaptureFormGetValues />
        <AlertDelayField />
      </>,
      {
        wrapper: createFormWrapper({
          kind: 'alert',
          stateTransitionAlertDelayMode: 'immediate',
          stateTransition: { pendingCount: 0 },
        }),
      }
    );

    const alertRow = screen.getByTestId('alertDelayFormRow');
    fireEvent.click(within(alertRow).getByText('Breaches'));

    const values = getFormValues!();
    expect(values.stateTransitionAlertDelayMode).toBe('breaches');
    expect(values.stateTransition?.pendingCount).toBe(2);
  });

  it('clears alert delay (pending) when switching to immediate while recovery delay stays on breaches', () => {
    getFormValues = undefined;
    render(
      <>
        <CaptureFormGetValues />
        <AlertDelayField />
        <RecoveryDelayField />
      </>,
      {
        wrapper: createFormWrapper({
          kind: 'alert',
          stateTransitionAlertDelayMode: 'breaches',
          stateTransitionRecoveryDelayMode: 'recoveries',
          stateTransition: {
            pendingCount: 2,
            pendingTimeframe: null,
            recoveringCount: 3,
            recoveringTimeframe: null,
          },
        }),
      }
    );

    const alertRow = screen.getByTestId('alertDelayFormRow');
    fireEvent.click(within(alertRow).getByText('Immediate'));

    const values = getFormValues!();
    expect(values.stateTransitionAlertDelayMode).toBe('immediate');
    expect(values.stateTransition?.pendingCount).toBeNull();
    expect(values.stateTransition?.pendingTimeframe).toBeNull();
    expect(values.stateTransition?.recoveringCount).toBe(3);

    expect(mapFormValuesToUpdateRequest(values).state_transition).toEqual({
      pending_count: 0,
      recovering_count: 3,
    });
  });
});
