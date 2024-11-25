/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AllowedStat } from '.';
import * as i18n from './translations';

describe('AllowedStat', () => {
  const defaultProps = {
    allowed: 3,
    total: 5,
  };

  it('renders the expected stat content', () => {
    render(<AllowedStat {...defaultProps} />);

    expect(screen.getByTestId('allowedStat')).toHaveTextContent('3Allowed');
  });

  it('displays the correct tooltip content', async () => {
    render(<AllowedStat {...defaultProps} />);

    await userEvent.hover(screen.getByTestId('allowedStat'));

    await waitFor(() => {
      expect(screen.getByText(i18n.ALLOWED_TOOLTIP(defaultProps))).toBeInTheDocument();
    });
  });
});
