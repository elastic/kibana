/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DescriptionField } from './description_field';
import { createFormWrapper, createMockServices } from '../../test_utils';

describe('DescriptionField', () => {
  it('renders textarea with Description label', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('shows optional label append', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(screen.getAllByText('optional').length).toBeGreaterThanOrEqual(1);
  });

  it('displays placeholder text', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(screen.getByPlaceholderText('Add rule description')).toBeInTheDocument();
  });

  it('displays initial description value', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'Test Rule',
        enabled: true,
        description: 'Initial description',
      },
    });

    render(<DescriptionField />, { wrapper: Wrapper });

    expect(screen.getByTestId('ruleDescriptionInput')).toHaveValue('Initial description');
  });

  it('updates value when user types in textarea', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    const textarea = screen.getByTestId('ruleDescriptionInput');
    await user.type(textarea, 'My new description');

    expect(textarea).toHaveValue('My new description');
  });

  it('renders correctly in flyout layout', () => {
    render(<DescriptionField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
  });
});
