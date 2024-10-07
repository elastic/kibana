/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AvailableStat } from '.';
import * as i18n from './translations';

describe('AvailableStat component', () => {
  const total = 5;

  it('renders the expected stat content', () => {
    render(<AvailableStat total={total} />);

    expect(screen.getByTestId('availableStat')).toHaveTextContent(`${total}Available`);
  });

  it('displays the tooltip with the correct content', async () => {
    render(<AvailableStat total={total} />);

    await userEvent.hover(screen.getByTestId('availableStat'));

    await waitFor(() => {
      const tooltipContent = i18n.AVAILABLE_TOOLTIP(total);

      expect(screen.getByText(tooltipContent)).toBeInTheDocument();
    });
  });
});
