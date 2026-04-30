/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditModeToggle } from './edit_mode_toggle';

describe('EditModeToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Form and YAML buttons', () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} />);

    expect(screen.getByText('Form')).toBeInTheDocument();
    expect(screen.getByText('YAML')).toBeInTheDocument();
  });

  it('shows Form as selected when editMode is form', () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} />);

    const formButton = screen.getByText('Form').closest('button');
    expect(formButton).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('shows YAML as selected when editMode is yaml', () => {
    render(<EditModeToggle editMode="yaml" onChange={mockOnChange} />);

    const yamlButton = screen.getByText('YAML').closest('button');
    expect(yamlButton).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('calls onChange with "yaml" when YAML button is clicked', async () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} />);

    await userEvent.click(screen.getByText('YAML'));

    expect(mockOnChange).toHaveBeenCalledWith('yaml');
  });

  it('calls onChange with "form" when Form button is clicked', async () => {
    render(<EditModeToggle editMode="yaml" onChange={mockOnChange} />);

    await userEvent.click(screen.getByText('Form'));

    expect(mockOnChange).toHaveBeenCalledWith('form');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} disabled />);

    const formButton = screen.getByText('Form').closest('button');
    const yamlButton = screen.getByText('YAML').closest('button');

    expect(formButton).toBeDisabled();
    expect(yamlButton).toBeDisabled();
  });

  it('does not call onChange when disabled and button is clicked', async () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} disabled />);

    await userEvent.click(screen.getByText('YAML'));

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('has correct data-test-subj attributes', () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} />);

    expect(screen.getByTestId('ruleV2FormEditModeToggle')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FormEditModeFormButton')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FormEditModeYamlButton')).toBeInTheDocument();
  });

  it('has accessible legend for screen readers', () => {
    render(<EditModeToggle editMode="form" onChange={mockOnChange} />);

    expect(screen.getByRole('group', { name: 'Edit mode selection' })).toBeInTheDocument();
  });
});
