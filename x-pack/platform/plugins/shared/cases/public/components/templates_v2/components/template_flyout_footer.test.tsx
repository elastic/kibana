/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateFlyoutFooter } from './template_flyout_footer';

describe('TemplateFlyoutFooter', () => {
  const defaultProps = {
    isFirstStep: true,
    isLastStep: false,
    isNextDisabled: false,
    isNextLoading: false,
    isImportDisabled: false,
    isImportLoading: false,
    selectedCount: 0,
    onCancel: jest.fn(),
    onBack: jest.fn(),
    onNext: jest.fn(),
    onImport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cancel button on first step', () => {
    render(<TemplateFlyoutFooter {...defaultProps} />);

    expect(screen.getByTestId('template-flyout-cancel')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders back button on non-first step', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isFirstStep={false} />);

    expect(screen.getByTestId('template-flyout-back')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders next button on non-last step', () => {
    render(<TemplateFlyoutFooter {...defaultProps} />);

    expect(screen.getByTestId('template-flyout-next')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('renders import button on last step', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isLastStep selectedCount={2} />);

    expect(screen.getByTestId('template-flyout-import')).toBeInTheDocument();
    expect(screen.getByText('Import 2 templates')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(<TemplateFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('template-flyout-cancel'));

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', async () => {
    render(<TemplateFlyoutFooter {...defaultProps} isFirstStep={false} />);

    await userEvent.click(screen.getByTestId('template-flyout-back'));

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button is clicked', async () => {
    render(<TemplateFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('template-flyout-next'));

    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onImport when import button is clicked', async () => {
    render(<TemplateFlyoutFooter {...defaultProps} isLastStep selectedCount={2} />);

    await userEvent.click(screen.getByTestId('template-flyout-import'));

    expect(defaultProps.onImport).toHaveBeenCalledTimes(1);
  });

  it('disables next button when isNextDisabled is true', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isNextDisabled />);

    expect(screen.getByTestId('template-flyout-next')).toBeDisabled();
  });

  it('shows loading state on next button when isNextLoading is true', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isNextLoading />);

    const button = screen.getByTestId('template-flyout-next');
    expect(button).toBeInTheDocument();
  });

  it('disables import button when isImportDisabled is true', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isLastStep isImportDisabled />);

    expect(screen.getByTestId('template-flyout-import')).toBeDisabled();
  });

  it('shows loading state on import button when isImportLoading is true', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isLastStep isImportLoading />);

    const button = screen.getByTestId('template-flyout-import');
    expect(button).toBeInTheDocument();
  });

  it('displays correct count in import button text', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isLastStep selectedCount={5} />);

    expect(screen.getByText('Import 5 templates')).toBeInTheDocument();
  });

  it('displays singular form when selectedCount is 1', () => {
    render(<TemplateFlyoutFooter {...defaultProps} isLastStep selectedCount={1} />);

    expect(screen.getByText('Import 1 template')).toBeInTheDocument();
  });
});
