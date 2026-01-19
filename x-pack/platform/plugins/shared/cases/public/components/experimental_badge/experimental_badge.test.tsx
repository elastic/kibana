/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { ExperimentalBadge } from './experimental_badge';

describe('ExperimentalBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the experimental badge', () => {
    renderWithTestingProviders(<ExperimentalBadge />);

    expect(screen.getByTestId('case-experimental-badge')).toBeInTheDocument();
  });

  it('renders the title correctly', () => {
    renderWithTestingProviders(<ExperimentalBadge />);

    expect(screen.getByText('Technical preview')).toBeInTheDocument();
  });
});
