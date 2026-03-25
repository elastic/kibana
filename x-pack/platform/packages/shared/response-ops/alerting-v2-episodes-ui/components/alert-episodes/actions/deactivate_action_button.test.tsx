/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeactivateActionButton } from './deactivate_action_button';

describe('DeactivateActionButton', () => {
  it('renders Deactivate when not deactivated', () => {
    render(<DeactivateActionButton lastDeactivateAction={null} />);
    expect(screen.getByTestId('alertingEpisodeActionsDeactivateActionButton')).toHaveTextContent(
      'Deactivate'
    );
  });

  it('renders Activate when deactivated', () => {
    render(<DeactivateActionButton lastDeactivateAction="deactivate" />);
    expect(screen.getByTestId('alertingEpisodeActionsDeactivateActionButton')).toHaveTextContent(
      'Activate'
    );
  });
});
