/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StateTransitionCountField } from './state_transition_count_field';
import { createFormWrapper } from '../../test_utils';

describe('StateTransitionCountField', () => {
  it('renders the consecutive breaches count input', () => {
    render(<StateTransitionCountField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByTestId('stateTransitionCountInput')).toBeInTheDocument();
  });

  it('renders with pre-filled state transition count from form state', () => {
    render(<StateTransitionCountField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        stateTransition: {
          pendingCount: 5,
        },
      }),
    });

    expect(screen.getByTestId('stateTransitionCountInput')).toHaveValue(5);
  });
});
