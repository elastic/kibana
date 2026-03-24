/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Sml } from './sml';

const defaultMockResults = [
  {
    chunk_id: 'chunk-1',
    attachment_id: 'att-1',
    attachment_type: 'visualization',
    title: 'Pacific Sales',
    content: 'content',
    score: 1,
  },
  {
    chunk_id: 'chunk-2',
    attachment_id: 'att-2',
    attachment_type: 'visualization',
    title: 'Atlantic Metrics',
    content: 'content',
    score: 0.9,
  },
];

let mockUseSmlSearchReturn: {
  results: typeof defaultMockResults;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: null;
} = {
  results: defaultMockResults,
  total: defaultMockResults.length,
  isLoading: false,
  isError: false,
  error: null,
};

jest.mock('../../../../../../../hooks/sml/use_sml_search', () => ({
  useSmlSearch: () => mockUseSmlSearchReturn,
}));

beforeEach(() => {
  mockUseSmlSearchReturn = {
    results: defaultMockResults,
    total: defaultMockResults.length,
    isLoading: false,
    isError: false,
    error: null,
  };
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('Sml', () => {
  it('renders SML search results as type/title', () => {
    const { container } = renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(container.textContent).toContain('visualization/Atlantic Metrics');
  });

  it('shows loading state when search is loading', () => {
    mockUseSmlSearchReturn = {
      results: [],
      total: 0,
      isLoading: true,
      isError: false,
      error: null,
    };

    renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(screen.getByTestId('smlMenu-loading')).toBeInTheDocument();
  });
});
