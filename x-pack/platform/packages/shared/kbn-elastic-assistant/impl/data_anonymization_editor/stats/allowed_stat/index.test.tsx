/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
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

  it('displays the correct tooltip content', () => {
    render(<AllowedStat {...defaultProps} />);

    fireEvent.mouseOver(screen.getByTestId('allowedStat'));

    expect(screen.getByText(i18n.ALLOWED_TOOLTIP(defaultProps))).toBeInTheDocument();
  });
});
