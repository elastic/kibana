/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { mockBrowserFields } from '../../mock';
import type { FieldBrowserModalProps } from './field_browser_modal';
import { FieldBrowserModal } from './field_browser_modal';

const mockOnHide = jest.fn();
const mockOnToggleColumn = jest.fn();
const mockOnResetColumns = jest.fn();

const testProps: FieldBrowserModalProps = {
  columnIds: [],
  filteredBrowserFields: mockBrowserFields,
  searchInput: '',
  appliedFilterInput: '',
  isSearching: false,
  setSelectedCategoryIds: jest.fn(),
  onHide: mockOnHide,
  onResetColumns: mockOnResetColumns,
  onSearchInputChange: jest.fn(),
  onToggleColumn: mockOnToggleColumn,
  restoreFocusTo: React.createRef<HTMLButtonElement>(),
  selectedCategoryIds: [],
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
};

const renderComponent = (props: Partial<FieldBrowserModalProps> = {}) =>
  render(<FieldBrowserModal {...{ ...testProps, ...props }} />);

describe('FieldBrowserModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the Close button', () => {
    renderComponent();

    expect(screen.getByTestId('close')).toHaveTextContent('Close');
  });

  test('it invokes the Close button', async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId('close'));
    expect(mockOnHide).toBeCalled();
  });

  test('it renders the Reset Fields button', () => {
    renderComponent();

    expect(screen.getByTestId('reset-fields')).toHaveTextContent('Reset Fields');
  });

  test('it invokes onResetColumns callback when the user clicks the Reset Fields button', async () => {
    renderComponent({ columnIds: ['test'] });

    await userEvent.click(screen.getByTestId('reset-fields'));
    expect(mockOnResetColumns).toHaveBeenCalled();
  });

  test('it invokes onHide when the user clicks the Reset Fields button', async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId('reset-fields'));

    expect(mockOnHide).toBeCalled();
  });

  test('it renders the search', () => {
    renderComponent();

    expect(screen.getByTestId('field-search')).toBeInTheDocument();
  });

  test('it renders the categories selector', () => {
    renderComponent();

    expect(screen.getByTestId('categories-selector')).toBeInTheDocument();
  });

  test('it renders the fields table', () => {
    renderComponent();

    expect(screen.getByTestId('field-table')).toBeInTheDocument();
  });

  test('focuses the search input when the component mounts', () => {
    renderComponent();

    const searchInput = screen.getByTestId('field-search');
    expect(searchInput.id === document.activeElement?.id).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the field search input', async () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';

    renderComponent({ onSearchInputChange });

    await userEvent.click(screen.getByTestId('field-search'));
    await userEvent.paste(inputText);

    expect(onSearchInputChange).toBeCalledWith(inputText);
  });

  test('it renders the CreateFieldButton when it is provided', () => {
    const MyTestComponent = () => <div>{'test'}</div>;

    renderComponent({ options: { createFieldButton: MyTestComponent } });

    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
