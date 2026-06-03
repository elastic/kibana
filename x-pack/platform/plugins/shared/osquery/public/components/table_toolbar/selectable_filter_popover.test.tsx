/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectableFilterPopover } from './selectable_filter_popover';
import type { FilterOption } from './selectable_filter_popover';

const OPTIONS: FilterOption[] = [
  { key: 'alpha', label: 'Alpha' },
  { key: 'beta', label: 'Beta' },
  { key: 'gamma', label: 'Gamma' },
];

const renderComponent = (
  props: Partial<{
    options: FilterOption[];
    selectedKeys: string[];
    onSelectionChange: jest.Mock;
  }> = {}
) => {
  const defaultProps = {
    label: 'Test filter',
    options: OPTIONS,
    selectedKeys: [] as string[],
    onSelectionChange: jest.fn(),
    'data-test-subj': 'test-filter',
    ...props,
  };

  return {
    ...render(React.createElement(SelectableFilterPopover, defaultProps)),
    ...defaultProps,
  };
};

describe('SelectableFilterPopover', () => {
  it('renders the filter button with the label', () => {
    renderComponent();

    expect(screen.getByTestId('test-filter-button')).toHaveTextContent('Test filter');
  });

  it('opens the popover when the button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('test-filter-button'));

    expect(screen.getByTestId('test-filter-popover')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('calls onSelectionChange with the selected key when an option is clicked', () => {
    const { onSelectionChange } = renderComponent();

    fireEvent.click(screen.getByTestId('test-filter-button'));
    fireEvent.click(screen.getByText('Beta'));

    expect(onSelectionChange).toHaveBeenCalledWith(['beta']);
  });

  it('calls onSelectionChange with key removed when deselecting', () => {
    const { onSelectionChange } = renderComponent({ selectedKeys: ['alpha', 'beta'] });

    fireEvent.click(screen.getByTestId('test-filter-button'));
    fireEvent.click(screen.getByText('Alpha'));

    expect(onSelectionChange).toHaveBeenCalledWith(['beta']);
  });

  it('appends to existing selection when selecting a new option', () => {
    const { onSelectionChange } = renderComponent({ selectedKeys: ['alpha'] });

    fireEvent.click(screen.getByTestId('test-filter-button'));
    fireEvent.click(screen.getByText('Gamma'));

    expect(onSelectionChange).toHaveBeenCalledWith(['alpha', 'gamma']);
  });

  it('shows active filter count on the button when options are selected', () => {
    renderComponent({ selectedKeys: ['alpha', 'gamma'] });

    const button = screen.getByTestId('test-filter-button');
    expect(button).toHaveTextContent('2');
  });

  it('shows no active count when nothing is selected', () => {
    renderComponent({ selectedKeys: [] });

    const button = screen.getByTestId('test-filter-button');
    expect(button).toHaveTextContent('Test filter');
    expect(button).not.toHaveTextContent(/\d/);
  });
});
