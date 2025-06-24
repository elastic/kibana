/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TextBasedDimensionEditor, TextBasedDimensionEditorProps } from './dimension_editor';

// Mock fetchFieldsFromESQL
jest.mock('@kbn/esql-editor', () => ({
  fetchFieldsFromESQL: jest.fn(),
}));

const { fetchFieldsFromESQL } = jest.requireMock('@kbn/esql-editor');

describe('TextBasedDimensionEditor', () => {
  const defaultProps = {
    isFullscreen: false,
    columnId: 'dim1',
    layerId: 'layer1',
    state: {
      layers: {
        layer1: {
          query: { esql: 'FROM my_data' },
          columns: [],
          indexPatternRefs: [],
        },
      },
      indexPatternRefs: [],
    },
    setState: jest.fn(),
    indexPatterns: {},
    dateRange: { fromDate: '2023-01-01', toDate: '2023-01-31' },
    expressions: {},
    esqlVariables: [
      {
        key: 'agent_keyword',
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
        type: 'values',
      },
    ],
    isMetricDimension: false,
    filterOperations: jest.fn(() => true),
    core: { docLinks: {} },
    groupId: 'rows',
  } as unknown as TextBasedDimensionEditorProps;

  beforeEach(() => {
    jest.clearAllMocks();

    fetchFieldsFromESQL.mockResolvedValue({
      columns: [
        { id: 'field1', name: 'Field One', meta: { type: 'string' } },
        { id: 'field2', name: 'Field Two', meta: { type: 'number' } },
      ],
    });
  });

  it('renders correctly and fetches columns on mount', async () => {
    render(<TextBasedDimensionEditor {...defaultProps} />);

    // Check if fetchFieldsFromESQL was called
    await waitFor(() => {
      expect(fetchFieldsFromESQL).toHaveBeenCalledTimes(1);
      expect(fetchFieldsFromESQL).toHaveBeenCalledWith(
        { esql: 'FROM my_data | limit 0' },
        {},
        { from: defaultProps.dateRange.fromDate, to: defaultProps.dateRange.toDate },
        undefined,
        undefined, // No index patterns
        defaultProps.esqlVariables
      );
    });

    expect(screen.getByTestId('text-based-dimension-field')).toBeInTheDocument();
  });
});
