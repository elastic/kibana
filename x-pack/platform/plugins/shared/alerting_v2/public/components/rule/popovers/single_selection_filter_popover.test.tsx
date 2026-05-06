/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FilterPopoverOption } from './single_selection_filter_popover';
import { SingleSelectionFilterPopover } from './single_selection_filter_popover';

const OPTIONS: FilterPopoverOption[] = [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2', iconType: 'bell' },
];

const defaultProps = {
  label: 'Test Filter',
  options: OPTIONS,
  dataTestSubj: 'testFilter',
  popoverLabel: 'Test filter options',
  ariaLabel: 'Filter by test',
  value: '',
  onChange: jest.fn(),
};

describe('SingleSelectionFilterPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter button with the label', () => {
    render(<SingleSelectionFilterPopover {...defaultProps} />);

    expect(screen.getByTestId('testFilter')).toBeInTheDocument();
    expect(screen.getByText('Test Filter')).toBeInTheDocument();
  });

  it('does not show active filter count when no value is selected', () => {
    render(<SingleSelectionFilterPopover {...defaultProps} value="" />);

    const button = screen.getByTestId('testFilter');
    expect(button).not.toHaveTextContent('1');
  });

  it('shows active filter count when a value is selected', () => {
    render(<SingleSelectionFilterPopover {...defaultProps} value="opt1" />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens the popover when the button is clicked', () => {
    render(<SingleSelectionFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('testFilter'));

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange with the selected value when an option is clicked', () => {
    const onChange = jest.fn();
    render(<SingleSelectionFilterPopover {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('testFilter'));
    fireEvent.click(screen.getByText('Option 1'));

    expect(onChange).toHaveBeenCalledWith('opt1');
  });

  it('calls onChange with empty string when the already-selected option is clicked (deselect)', () => {
    const onChange = jest.fn();
    render(<SingleSelectionFilterPopover {...defaultProps} value="opt1" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('testFilter'));
    fireEvent.click(screen.getByText('Option 1'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renders option data-test-subj attributes', () => {
    render(<SingleSelectionFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('testFilter'));

    expect(screen.getByTestId('testFilterOption-opt1')).toBeInTheDocument();
    expect(screen.getByTestId('testFilterOption-opt2')).toBeInTheDocument();
  });

  it('applies custom buttonWidth', () => {
    render(<SingleSelectionFilterPopover {...defaultProps} buttonWidth={200} />);

    expect(screen.getByTestId('testFilter')).toBeInTheDocument();
  });
});
