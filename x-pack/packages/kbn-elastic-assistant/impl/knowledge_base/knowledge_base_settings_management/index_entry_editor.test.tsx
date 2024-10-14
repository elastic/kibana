/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { IndexEntryEditor } from './index_entry_editor';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { IndexEntry } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';

describe('IndexEntryEditor', () => {
  const mockSetEntry = jest.fn();
  const mockDataViews = {
    getIndices: jest.fn().mockResolvedValue([{ name: 'index-1' }, { name: 'index-2' }]),
    getFieldsForWildcard: jest.fn().mockResolvedValue([
      { name: 'field-1', esTypes: ['semantic_text'] },
      { name: 'field-2', esTypes: ['text'] },
      { name: 'field-3', esTypes: ['semantic_text'] },
    ]),
  } as unknown as DataViewsContract;

  const defaultProps = {
    dataViews: mockDataViews,
    setEntry: mockSetEntry,
    hasManageGlobalKnowledgeBase: true,
    entry: {
      name: 'Test Entry',
      index: 'index-1',
      field: 'field-1',
      description: 'Test Description',
      queryDescription: 'Test Query Description',
      users: [],
    } as unknown as IndexEntry,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form fields with initial values', () => {
    const { getByDisplayValue } = render(<IndexEntryEditor {...defaultProps} />);

    waitFor(() => {
      expect(getByDisplayValue('Test Entry')).toBeInTheDocument();
      expect(getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(getByDisplayValue('Test Query Description')).toBeInTheDocument();
      expect(getByDisplayValue('index-1')).toBeInTheDocument();
      expect(getByDisplayValue('field-1')).toBeInTheDocument();
    });
  });

  it('updates the name field on change', () => {
    const { getByPlaceholderText } = render(<IndexEntryEditor {...defaultProps} />);

    waitFor(() => {
      const nameInput = getByPlaceholderText(i18n.ENTRY_NAME_INPUT_PLACEHOLDER);
      fireEvent.change(nameInput, { target: { value: 'New Entry Name' } });
    });

    expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
  });

  it('updates the description field on change', () => {
    const { getByPlaceholderText } = render(<IndexEntryEditor {...defaultProps} />);
    waitFor(() => {
      const descriptionInput = getByPlaceholderText(i18n.ENTRY_DESCRIPTION_HELP_LABEL);
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    });

    expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
  });

  it('updates the query description field on change', () => {
    const { getByPlaceholderText } = render(<IndexEntryEditor {...defaultProps} />);
    waitFor(() => {
      const queryDescriptionInput = getByPlaceholderText(i18n.ENTRY_QUERY_DESCRIPTION_HELP_LABEL);
      fireEvent.change(queryDescriptionInput, { target: { value: 'New Query Description' } });
    });

    expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
  });

  it('displays sharing options and updates on selection', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(getByTestId('sharing-select'));
      fireEvent.click(getByTestId('sharing-private-option'));
    });
    await waitFor(() => {
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('fetches index options and updates on selection', async () => {
    const { getAllByTestId, getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => expect(mockDataViews.getIndices).toHaveBeenCalled());

    await waitFor(() => {
      fireEvent.click(getByTestId('index-combobox'));
      fireEvent.click(getAllByTestId('comboBoxToggleListButton')[0]);
    });
    fireEvent.click(getByTestId('index-2'));

    expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
  });

  it('fetches field options based on selected index and updates on selection', async () => {
    const { getByTestId, getAllByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() =>
      expect(mockDataViews.getFieldsForWildcard).toHaveBeenCalledWith({
        pattern: 'index-1',
        fieldTypes: ['semantic_text'],
      })
    );

    await waitFor(() => {
      fireEvent.click(getByTestId('index-combobox'));
      fireEvent.click(getAllByTestId('comboBoxToggleListButton')[0]);
    });
    fireEvent.click(getByTestId('index-2'));

    await waitFor(() => {
      fireEvent.click(getByTestId('entry-combobox'));
    });

    await userEvent.type(
      within(getByTestId('entry-combobox')).getByTestId('comboBoxSearchInput'),
      'field-3'
    );
    expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
  });

  it('disables the field combo box if no index is selected', () => {
    const { getByRole } = render(
      <IndexEntryEditor {...defaultProps} entry={{ ...defaultProps.entry, index: '' }} />
    );

    waitFor(() => {
      expect(getByRole('combobox', { name: i18n.ENTRY_FIELD_PLACEHOLDER })).toBeDisabled();
    });
  });
});
