/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StateTransitionFieldGroup } from './state_transition_field_group';
import { createFormWrapper } from '../../test_utils';

describe('StateTransitionFieldGroup', () => {
  it('renders immediate mode by default when kind is "alert"', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('Alert delay')).toBeInTheDocument();
    expect(screen.getByText('Immediate')).toBeInTheDocument();
    expect(screen.getByText('Breaches')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionImmediateDescription')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionCountInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionTimeframeNumberInput')).not.toBeInTheDocument();
  });

  it('shows breaches input when breaches is selected', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Breaches' }));

    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionImmediateDescription')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionTimeframeNumberInput')).not.toBeInTheDocument();
  });

  it('does not render when kind is "signal"', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'signal' }),
    });

    expect(screen.queryByText('Alert delay')).not.toBeInTheDocument();
  });

  it('shows immediate mode text when immediate is selected', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Immediate' }));

    expect(screen.getByTestId('stateTransitionImmediateDescription')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionCountInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionTimeframeNumberInput')).not.toBeInTheDocument();
  });

  it('shows duration inputs when duration is selected', () => {
    render(<StateTransitionFieldGroup />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Duration' }));

    expect(screen.getByTestId('stateTransitionTimeframeNumberInput')).toBeInTheDocument();
    expect(screen.getByTestId('stateTransitionTimeframeUnitInput')).toBeInTheDocument();
    expect(screen.queryByTestId('stateTransitionCountInput')).not.toBeInTheDocument();
  });
});
