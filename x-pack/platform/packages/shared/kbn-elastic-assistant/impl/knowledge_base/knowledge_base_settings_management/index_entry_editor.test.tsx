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
import { useKnowledgeBaseIndices } from '../../assistant/api/knowledge_base/use_knowledge_base_indices';
import { HttpSetup } from '@kbn/core-http-browser';

jest.mock('../../assistant/api/knowledge_base/use_knowledge_base_indices');

describe('IndexEntryEditor', () => {
  const mockSetEntry = jest.fn();
  const mockDataViews = {
    getFieldsForWildcard: jest.fn().mockResolvedValue([
      { name: 'field-1', esTypes: ['semantic_text'] },
      { name: 'field-2', esTypes: ['text'] },
      { name: 'field-3', esTypes: ['semantic_text'] },
    ]),
    getExistingIndices: jest.fn().mockResolvedValue(['index-1']),
  } as unknown as DataViewsContract;
  const http = {
    get: jest.fn(),
  } as unknown as HttpSetup;

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
    http,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKnowledgeBaseIndices as jest.Mock).mockReturnValue({
      data: { 'index-1': ['field-1'], 'index-2': ['field-2'] },
    });
  });

  it('renders the form fields with initial values', async () => {
    const { getByDisplayValue } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(getByDisplayValue('Test Entry')).toBeInTheDocument();
      expect(getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(getByDisplayValue('Test Query Description')).toBeInTheDocument();
      expect(getByDisplayValue('index-1')).toBeInTheDocument();
      expect(getByDisplayValue('field-1')).toBeInTheDocument();
    });
  });

  it('updates the name field on change', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      const nameInput = getByTestId('entry-name');
      fireEvent.change(nameInput, { target: { value: 'New Entry Name' } });
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('updates the description field on change', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      const descriptionInput = getByTestId('entry-description');
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    });

    await waitFor(() => {
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('updates the query description field on change', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      const queryDescriptionInput = getByTestId('query-description');
      fireEvent.change(queryDescriptionInput, { target: { value: 'New Query Description' } });
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('displays sharing options and updates on selection', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(getByTestId('sharing-select'));
      fireEvent.click(getByTestId('sharing-private-option'));
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('fetches index options and updates on selection', async () => {
    const { getAllByTestId, getByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(getByTestId('index-combobox'));
      fireEvent.click(getAllByTestId('comboBoxToggleListButton')[0]);
      fireEvent.click(getByTestId('index-2'));
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('fetches field options based on selected index and updates on selection', async () => {
    const { getByTestId, getAllByTestId } = render(<IndexEntryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(mockDataViews.getFieldsForWildcard).toHaveBeenCalledWith({
        pattern: 'index-1',
      });
    });

    await waitFor(async () => {
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

    await waitFor(() => {
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('disables the field combo box if no index is selected', () => {
    const { getByRole } = render(
      <IndexEntryEditor {...defaultProps} entry={{ ...defaultProps.entry, index: '' }} />
    );

    waitFor(() => {
      expect(getByRole('combobox', { name: i18n.ENTRY_FIELD_PLACEHOLDER })).toBeDisabled();
    });
  });

  it('fetches index options and updates on selection 2', async () => {
    (mockDataViews.getExistingIndices as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(
      <IndexEntryEditor
        {...defaultProps}
        entry={{ ...defaultProps.entry, index: 'missing-index' }}
      />
    );

    await waitFor(() => {
      expect(mockDataViews.getExistingIndices).toHaveBeenCalled();
    });

    expect(getByText("Index doesn't exist")).toBeInTheDocument();
  });
});
