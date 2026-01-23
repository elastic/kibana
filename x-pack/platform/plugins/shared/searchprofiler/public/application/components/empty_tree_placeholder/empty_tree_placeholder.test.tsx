/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyTreePlaceHolder } from '.';

describe('EmptyTreePlaceholder', () => {
  it('renders', () => {
    render(<EmptyTreePlaceHolder />);

    expect(screen.getByRole('heading', { name: 'No queries to profile' })).toBeInTheDocument();
    expect(
      screen.getByText('Enter a query, click Profile, and see the results here.')
    ).toBeInTheDocument();
  });
});
