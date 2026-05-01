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
  it('renders "Add description" button when no description value exists', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('addDescriptionButton')).toBeInTheDocument();
    expect(screen.getByText('Add description')).toBeInTheDocument();
  });

  it('does not render textarea initially when no description', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(screen.queryByTestId('ruleDescriptionInput')).not.toBeInTheDocument();
  });

  it('shows textarea when "Add description" button is clicked', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    await user.click(screen.getByTestId('addDescriptionButton'));

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('displays textarea directly when initial description value exists', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'Test Rule',
        enabled: true,
        description: 'Initial description',
      },
    });

    render(<DescriptionField />, { wrapper: Wrapper });

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDescriptionInput')).toHaveValue('Initial description');
    expect(screen.queryByTestId('addDescriptionButton')).not.toBeInTheDocument();
  });

  it('displays placeholder text in textarea', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    await user.click(screen.getByTestId('addDescriptionButton'));

    expect(
      screen.getByPlaceholderText('Add an optional description for this rule...')
    ).toBeInTheDocument();
  });

  it('updates value when user types in textarea', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    await user.click(screen.getByTestId('addDescriptionButton'));
    const textarea = screen.getByTestId('ruleDescriptionInput');
    await user.type(textarea, 'My new description');

    expect(textarea).toHaveValue('My new description');
  });

  it('renders correctly in flyout layout', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    await user.click(screen.getByTestId('addDescriptionButton'));

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
  });

  it('keeps textarea visible after clearing the value', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    await user.click(screen.getByTestId('addDescriptionButton'));
    const textarea = screen.getByTestId('ruleDescriptionInput');
    await user.type(textarea, 'test');
    await user.clear(textarea);

    // Textarea should still be visible even though value is cleared
    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
  });
});
