/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertEpisodeViewDetailsActionButton } from './view_details_action_button';

describe('AlertEpisodeViewDetailsActionButton', () => {
  it('renders an anchor with the provided href', () => {
    render(<AlertEpisodeViewDetailsActionButton href="/app/management/alertingV2/episodes/ep-1" />);

    expect(screen.getByTestId('alertingEpisodeActionsViewDetailsButton')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/episodes/ep-1'
    );
  });
});
