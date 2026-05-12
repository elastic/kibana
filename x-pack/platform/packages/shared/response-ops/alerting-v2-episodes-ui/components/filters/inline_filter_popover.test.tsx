/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineFilterPopover } from './inline_filter_popover';

describe('InlineFilterPopover', () => {
  const mockOptions = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ];

  const defaultProps = {
    options: mockOptions,
    selectedValues: [],
    singleSelect: false,
    onSelectionChange: jest.fn(),
    emptyMessage: 'No options',
    'data-test-subj': 'test-popover',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with options', () => {
    render(<InlineFilterPopover {...defaultProps} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders empty message when no options', () => {
    render(<InlineFilterPopover {...defaultProps} options={[]} />);
    expect(screen.getByText('No options')).toBeInTheDocument();
  });

  it('marks selected values as checked', () => {
    render(<InlineFilterPopover {...defaultProps} selectedValues={['option1', 'option3']} />);
    const option1 = screen.getByTestId('test-popover-option-option1');
    const option2 = screen.getByTestId('test-popover-option-option2');
    const option3 = screen.getByTestId('test-popover-option-option3');
    expect(option1).toHaveAttribute('aria-checked', 'true');
    expect(option2).toHaveAttribute('aria-checked', 'false');
    expect(option3).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSelectionChange when option is selected in multi-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(<InlineFilterPopover {...defaultProps} onSelectionChange={onSelectionChange} />);

    await userEvent.click(screen.getByText('Option 1'));
    expect(onSelectionChange).toHaveBeenCalledWith(['option1']);
  });

  it('calls onSelectionChange with multiple values in multi-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(
      <InlineFilterPopover
        {...defaultProps}
        selectedValues={['option1']}
        onSelectionChange={onSelectionChange}
      />
    );

    await userEvent.click(screen.getByText('Option 2'));
    expect(onSelectionChange).toHaveBeenCalledWith(['option1', 'option2']);
  });

  it('calls onSelectionChange with only last selected value in single-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(
      <InlineFilterPopover
        {...defaultProps}
        singleSelect={true}
        selectedValues={['option1']}
        onSelectionChange={onSelectionChange}
      />
    );

    await userEvent.click(screen.getByText('Option 2'));
    expect(onSelectionChange).toHaveBeenCalledWith(['option2']);
  });

  it('calls onSelectionChange with empty array when deselecting in single-select mode', async () => {
    const onSelectionChange = jest.fn();
    render(
      <InlineFilterPopover
        {...defaultProps}
        singleSelect={true}
        selectedValues={['option1']}
        onSelectionChange={onSelectionChange}
      />
    );

    await userEvent.click(screen.getByText('Option 1'));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('renders search input when searchable is true', () => {
    const onSearchChange = jest.fn();
    render(
      <InlineFilterPopover
        {...defaultProps}
        searchable={true}
        searchValue="test"
        onSearchChange={onSearchChange}
        searchPlaceholder="Search options"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search options');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('test');
  });

  it('calls onSearchChange when typing in search input', async () => {
    const onSearchChange = jest.fn();
    render(
      <InlineFilterPopover
        {...defaultProps}
        searchable={true}
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Search options"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search options');
    await userEvent.type(searchInput, 'a');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('does not render search input when searchable is false', () => {
    render(
      <InlineFilterPopover
        {...defaultProps}
        searchable={false}
        searchPlaceholder="Search options"
      />
    );

    expect(screen.queryByPlaceholderText('Search options')).not.toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<InlineFilterPopover {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('applies correct data-test-subj to options', () => {
    render(<InlineFilterPopover {...defaultProps} />);
    expect(screen.getByTestId('test-popover-option-option1')).toBeInTheDocument();
    expect(screen.getByTestId('test-popover-option-option2')).toBeInTheDocument();
    expect(screen.getByTestId('test-popover-option-option3')).toBeInTheDocument();
  });
});
