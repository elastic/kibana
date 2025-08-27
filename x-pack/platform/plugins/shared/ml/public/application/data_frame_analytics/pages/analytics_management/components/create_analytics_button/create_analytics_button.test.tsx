/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateAnalyticsButton } from './create_analytics_button';

describe('Data Frame Analytics: <CreateAnalyticsButton />', () => {
  test('renders button with correct text', () => {
    render(<CreateAnalyticsButton isDisabled={false} navigateToSourceSelection={jest.fn()} />);

    expect(screen.getByText('Create job')).toBeInTheDocument();
  });

  test('calls navigateToSourceSelection when clicked', async () => {
    const navigateToSourceSelection = jest.fn();
    const user = userEvent.setup();

    render(
      <CreateAnalyticsButton
        isDisabled={false}
        navigateToSourceSelection={navigateToSourceSelection}
      />
    );

    await user.click(screen.getByText('Create job'));
    expect(navigateToSourceSelection).toHaveBeenCalledTimes(1);
  });
});
