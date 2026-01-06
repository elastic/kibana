/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisplayMoreOptions } from './display_more_options';

describe('DisplayMoreOptions', () => {
  const toggleShowingMoreOptions = jest.fn();

  const options = {
    showingMoreOptions: false,
    toggleShowingMoreOptions,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the more options text', () => {
    render(<DisplayMoreOptions {...options} />);

    expect(screen.getByText('More options')).toBeInTheDocument();
  });

  it('shows close aria label when the additional options are shown', () => {
    render(<DisplayMoreOptions {...{ ...options, showingMoreOptions: true }} />);

    const button = screen.getByTestId('jsm-display-more-options');
    expect(button).toHaveAttribute('aria-label', 'Hide options');
  });

  it('calls toggleShowingMoreOptions when clicked', async () => {
    render(<DisplayMoreOptions {...options} />);

    await userEvent.click(screen.getByTestId('jsm-display-more-options'));

    expect(toggleShowingMoreOptions).toHaveBeenCalledTimes(1);
  });
});
