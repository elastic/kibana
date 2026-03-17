/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateFormHeader } from './template_form_header';
import { renderWithTestingProviders } from '../../../common/mock';

describe('TemplateFormHeader', () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const defaultProps = {
    title: 'Test Template',
    isLoading: false,
    isSaving: false,
    hasChanges: false,
    isEdit: false,
    submitError: null,
    onBack: jest.fn(),
    onReset: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Test Template' })).toBeInTheDocument();
  });

  it('renders back button with correct label', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Back to Templates' })).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Back to Templates' }));

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows "Create" button when not in edit mode', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} isEdit={false} />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('shows "Save" button when in edit mode', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} isEdit={true} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('disables save button when loading', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('disables save button when saving', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} isSaving={true} />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('shows loading state on save button when saving', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} isSaving={true} />);

    const saveButton = screen.getByRole('button', { name: 'Create' });
    expect(saveButton).toBeDisabled();
  });

  it('shows unsaved changes badge when hasChanges is true', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} hasChanges={true} />);

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('does not show unsaved changes badge when hasChanges is false', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} hasChanges={false} />);

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('shows reset button when hasChanges is true', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} hasChanges={true} />);

    expect(screen.getByTestId('resetTemplateButton')).toBeInTheDocument();
  });

  it('does not show reset button when hasChanges is false', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} hasChanges={false} />);

    expect(screen.queryByTestId('resetTemplateButton')).not.toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', async () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} hasChanges={true} />);

    await user.click(screen.getByTestId('resetTemplateButton'));

    expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
  });

  it('shows "Revert to default template" tooltip when not in edit mode', async () => {
    renderWithTestingProviders(
      <TemplateFormHeader {...defaultProps} hasChanges={true} isEdit={false} />
    );

    await user.hover(screen.getByTestId('resetTemplateButton'));

    expect(await screen.findByText('Revert to default template')).toBeInTheDocument();
  });

  it('shows "Revert to last saved version" tooltip when in edit mode', async () => {
    renderWithTestingProviders(
      <TemplateFormHeader {...defaultProps} hasChanges={true} isEdit={true} />
    );

    await user.hover(screen.getByTestId('resetTemplateButton'));

    expect(await screen.findByText('Revert to last saved version')).toBeInTheDocument();
  });

  it('disables reset button when loading', () => {
    renderWithTestingProviders(
      <TemplateFormHeader {...defaultProps} hasChanges={true} isLoading={true} />
    );

    expect(screen.getByTestId('resetTemplateButton')).toBeDisabled();
  });

  it('disables reset button when saving', () => {
    renderWithTestingProviders(
      <TemplateFormHeader {...defaultProps} hasChanges={true} isSaving={true} />
    );

    expect(screen.getByTestId('resetTemplateButton')).toBeDisabled();
  });

  it('shows error tooltip on save button when submitError is present', async () => {
    renderWithTestingProviders(
      <TemplateFormHeader {...defaultProps} submitError="Something went wrong" />
    );

    await user.hover(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows skeleton loading state for title when isLoading is true', () => {
    renderWithTestingProviders(<TemplateFormHeader {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('progressbar', { name: 'Loading Test Template' })).toBeInTheDocument();
  });
});
