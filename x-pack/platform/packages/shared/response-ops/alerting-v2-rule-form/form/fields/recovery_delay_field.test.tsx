/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import { RecoveryDelayField } from './recovery_delay_field';
import { AlertDelayField } from './alert_delay_field';
import type { FormValues } from '../types';
import { mapFormValuesToUpdateRequest } from '../utils/rule_request_mappers';
import { createFormWrapper, createMockServices } from '../../test_utils';

let getFormValues: (() => FormValues) | undefined;

const CaptureFormGetValues = () => {
  getFormValues = useFormContext<FormValues>().getValues;
  return null;
};

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

  it('shows breaches controls when recovery delay mode is breaches', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransitionRecoveryDelayMode: 'breaches',
        stateTransition: { recoveringCount: 4 },
      }),
    });

    expect(screen.getByTestId('recoveryTransitionCountInput')).toBeInTheDocument();
  });

  it('shows duration controls when recovery delay mode is duration', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransitionRecoveryDelayMode: 'duration',
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
        stateTransitionRecoveryDelayMode: 'breaches',
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

  it('renders correctly in flyout layout', () => {
    render(<RecoveryDelayField />, {
      wrapper: createFormWrapper({ kind: 'alert' }, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByTestId('recoveryDelayMode')).toBeInTheDocument();
  });

  it('clears recovery delay (recovering) when switching to immediate while alert delay stays on breaches', () => {
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
          stateTransitionRecoveryDelayMode: 'breaches',
          stateTransition: {
            pendingCount: 2,
            pendingTimeframe: null,
            recoveringCount: 3,
            recoveringTimeframe: null,
          },
        }),
      }
    );

    const recoveryRow = screen.getByTestId('recoveryDelayFormRow');
    fireEvent.click(within(recoveryRow).getByText('Immediate'));

    const values = getFormValues!();
    expect(values.stateTransitionRecoveryDelayMode).toBe('immediate');
    expect(values.stateTransition?.recoveringCount).toBeNull();
    expect(values.stateTransition?.recoveringTimeframe).toBeNull();
    expect(values.stateTransition?.pendingCount).toBe(2);

    expect(mapFormValuesToUpdateRequest(values).state_transition).toEqual({
      pending_count: 2,
    });
  });
});
