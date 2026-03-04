/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
