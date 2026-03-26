/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileLoadingPlaceholder } from '.';

describe('Profile Loading Placeholder', () => {
  it('renders', () => {
    render(<ProfileLoadingPlaceholder />);

    // Visible UI boundary: loading title renders
    expect(screen.getByRole('heading', { name: 'Loading query profiles...' })).toBeInTheDocument();
  });
});
