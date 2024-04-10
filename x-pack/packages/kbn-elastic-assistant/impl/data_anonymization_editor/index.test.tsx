/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectedPromptContext } from '../assistant/prompt_context/types';
import { TestProviders } from '../mock/test_providers/test_providers';
import { DataAnonymizationEditor } from '.';

describe('DataAnonymizationEditor', () => {
  const mockSelectedPromptContext: SelectedPromptContext = {
    contextAnonymizationFields: {
      total: 0,
      page: 1,
      perPage: 1000,
      data: [
        {
          id: 'field1',
          field: 'field1',
          anonymized: true,
          allowed: true,
        },
        {
          id: 'field2',
          field: 'field2',
          anonymized: false,
          allowed: true,
        },
      ],
    },
    promptContextId: 'test-id',
    rawData: 'test-raw-data',
  };

  it('renders stats', () => {
    render(
      <TestProviders>
        <DataAnonymizationEditor
          selectedPromptContext={mockSelectedPromptContext}
          setSelectedPromptContexts={jest.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('stats')).toBeInTheDocument();
  });

  describe('when rawData is a string (non-anonymized data)', () => {
    it('renders the ReadOnlyContextViewer when rawData is (non-anonymized data)', () => {
      render(
        <TestProviders>
          <DataAnonymizationEditor
            selectedPromptContext={mockSelectedPromptContext}
            setSelectedPromptContexts={jest.fn()}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('readOnlyContextViewer')).toBeInTheDocument();
    });

    it('does NOT render the ContextEditor when rawData is non-anonymized data', () => {
      render(
        <TestProviders>
          <DataAnonymizationEditor
            selectedPromptContext={mockSelectedPromptContext}
            setSelectedPromptContexts={jest.fn()}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('contextEditor')).not.toBeInTheDocument();
    });
  });

  describe('when rawData is a `Record<string, string[]>` (anonymized data)', () => {
    const setSelectedPromptContexts = jest.fn();
    const mockRawData: Record<string, string[]> = {
      field1: ['value1', 'value2'],
      field2: ['value3', 'value4', 'value5'],
      field3: ['value6'],
    };

    const selectedPromptContextWithAnonymized: SelectedPromptContext = {
      ...mockSelectedPromptContext,
      rawData: mockRawData,
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <DataAnonymizationEditor
            selectedPromptContext={selectedPromptContextWithAnonymized}
            setSelectedPromptContexts={setSelectedPromptContexts}
          />
        </TestProviders>
      );
    });

    it('renders the ContextEditor when rawData is anonymized data', () => {
      expect(screen.getByTestId('contextEditor')).toBeInTheDocument();
    });

    it('does NOT render the ReadOnlyContextViewer when rawData is anonymized data', () => {
      expect(screen.queryByTestId('readOnlyContextViewer')).not.toBeInTheDocument();
    });

    it('calls setSelectedPromptContexts when a field is toggled', () => {
      userEvent.click(screen.getAllByTestId('allowed')[0]); // toggle the first field

      expect(setSelectedPromptContexts).toBeCalled();
    });
  });
});
