/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { IndexEntryEditor } from './index_entry_editor';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { IndexEntry } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';
import { I18nProvider } from '@kbn/i18n-react';
import { useIndexMappings } from './use_index_mappings';
import type { HttpSetup } from '@kbn/core-http-browser';

jest.mock('./use_index_mappings');

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('IndexEntryEditor', () => {
  const mockSetEntry = jest.fn();
  const mockDataViews = {
    getExistingIndices: jest.fn().mockResolvedValue(['index-1']),
    getIndices: jest.fn().mockResolvedValue([
      { name: 'index-1', attributes: ['open'] },
      { name: 'index-2', attributes: ['open'] },
    ]),
  } as unknown as DataViewsContract;
  const http = {
    get: jest.fn(),
  } as unknown as HttpSetup;

  const defaultProps = {
    dataViews: mockDataViews,
    docLink: 'www.elastic.co',
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
    (useIndexMappings as jest.Mock).mockImplementation(({ indexName }) => {
      if (indexName === 'index-1') {
        return {
          data: {
            mappings: {
              properties: {
                'field-1-text': { type: 'text' },
                'field-1-keyword': { type: 'keyword' },
              },
            },
          },
        };
      }
      if (indexName === 'index-2') {
        return {
          data: {
            mappings: {
              properties: {
                'field-2-text': { type: 'text' },
                'field-2-semantic': { type: 'semantic_text' },
              },
            },
          },
        };
      }
      return { data: undefined };
    });
  });

  it('renders the form fields with initial values', async () => {
    const { getByDisplayValue } = render(<IndexEntryEditor {...defaultProps} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(getByDisplayValue('Test Entry')).toBeInTheDocument();
      expect(getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(getByDisplayValue('Test Query Description')).toBeInTheDocument();
      expect(getByDisplayValue('index-1')).toBeInTheDocument();
      expect(getByDisplayValue('field-1')).toBeInTheDocument();
    });
  });

  it('updates the name field on change', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      const nameInput = getByTestId('entry-name');
      fireEvent.change(nameInput, { target: { value: 'New Entry Name' } });
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('updates the description field on change', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      const descriptionInput = getByTestId('entry-description');
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    });

    await waitFor(() => {
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('updates the query description field on change', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      const queryDescriptionInput = getByTestId('query-description');
      fireEvent.change(queryDescriptionInput, { target: { value: 'New Query Description' } });
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('displays sharing options and updates on selection', async () => {
    const { getByTestId } = render(<IndexEntryEditor {...defaultProps} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(getByTestId('sharing-select'));
      fireEvent.click(getByTestId('sharing-private-option'));
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('fetches index options and updates on selection', async () => {
    const { getAllByTestId, getByTestId } = render(<IndexEntryEditor {...defaultProps} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(getByTestId('index-combobox'));
      fireEvent.click(getAllByTestId('comboBoxToggleListButton')[0]);
      fireEvent.click(getByTestId('index-2'));
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('fetches field options based on selected index and updates on selection', async () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <IndexEntryEditor {...defaultProps} />,
      {
        wrapper: Wrapper,
      }
    );

    await waitFor(() => {
      expect(useIndexMappings).toHaveBeenCalledWith({
        http,
        indexName: 'index-1',
      });
    });

    // Open field dropdown and check options for index-1
    fireEvent.click(within(getByTestId('entry-combobox')).getByTestId('comboBoxToggleListButton'));
    await waitFor(() => {
      expect(getByTestId('field-option-field-1-text')).toBeInTheDocument();
      expect(queryByTestId('field-option-field-1-keyword')).not.toBeInTheDocument();
    });

    // Close the dropdown before re-rendering
    fireEvent.click(within(getByTestId('entry-combobox')).getByTestId('comboBoxToggleListButton'));

    // Change index to index-2
    const newEntry = { ...defaultProps.entry, index: 'index-2', field: '' };
    rerender(<IndexEntryEditor {...defaultProps} entry={newEntry} />);

    await waitFor(() => {
      expect(useIndexMappings).toHaveBeenCalledWith({
        http,
        indexName: 'index-2',
      });
    });

    // Open field dropdown and check options for index-2
    fireEvent.click(within(getByTestId('entry-combobox')).getByTestId('comboBoxToggleListButton'));
    await waitFor(() => {
      expect(getByTestId('field-option-field-2-text')).toBeInTheDocument();
      expect(getByTestId('field-option-field-2-semantic')).toBeInTheDocument();
    });

    // Select a new field
    fireEvent.click(getByTestId('field-option-field-2-text'));
    await waitFor(() => {
      expect(mockSetEntry).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('disables the field combo box if no index is selected', () => {
    const { getByRole } = render(
      <IndexEntryEditor {...defaultProps} entry={{ ...defaultProps.entry, index: '' }} />,
      {
        wrapper: Wrapper,
      }
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
      />,
      {
        wrapper: Wrapper,
      }
    );

    await waitFor(() => {
      expect(mockDataViews.getExistingIndices).toHaveBeenCalled();
    });

    expect(getByText("Index doesn't exist")).toBeInTheDocument();
  });
});
