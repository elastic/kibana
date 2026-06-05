/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Sml } from './sml';
import { CommandId } from '../../types';

const defaultMockResults = [
  {
    id: 'chunk-1',
    origin_id: 'att-1',
    type: 'visualization',
    title: 'Pacific Sales',
  },
  {
    id: 'chunk-2',
    origin_id: 'att-2',
    type: 'visualization',
    title: 'Atlantic Metrics',
  },
];

let mockUseSmlAutocompleteReturn: {
  results: typeof defaultMockResults;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} = {
  results: defaultMockResults,
  total: defaultMockResults.length,
  isLoading: false,
  isError: false,
  error: null,
};

const mockUseSmlAutocomplete = jest.fn(() => mockUseSmlAutocompleteReturn);

jest.mock('../../../../../../../hooks/sml/use_sml_autocomplete', () => ({
  useSmlAutocomplete: (...args: unknown[]) => mockUseSmlAutocomplete(...(args as [])),
}));

jest.mock('../../../../../../../hooks/use_conversation', () => ({
  useAgentId: () => 'test-agent-id',
}));

jest.mock('../../../../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: null, isLoading: false, error: null }),
}));

beforeEach(() => {
  mockUseSmlAutocompleteReturn = {
    results: defaultMockResults,
    total: defaultMockResults.length,
    isLoading: false,
    isError: false,
    error: null,
  };
  mockUseSmlAutocomplete.mockClear();
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('Sml', () => {
  it('renders SML autocomplete results as type/title', () => {
    const { container } = renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(container.textContent).toContain('visualization/Atlantic Metrics');
  });

  it('shows loading state when autocomplete is loading', () => {
    mockUseSmlAutocompleteReturn = {
      results: [],
      total: 0,
      isLoading: true,
      isError: false,
      error: null,
    };

    renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(screen.getByTestId('smlMenu-loading')).toBeInTheDocument();
  });

  it('calls onSelect with SML command id, chunk id, and type/title label when a row is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(<Sml query="" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Pacific Sales'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      commandId: CommandId.Sml,
      id: 'chunk-1',
      label: 'visualization/Pacific Sales',
      metadata: {},
    });
  });

  it('shows default empty list when autocomplete errors with no results', () => {
    mockUseSmlAutocompleteReturn = {
      results: [],
      total: 0,
      isLoading: false,
      isError: true,
      error: new Error('network'),
    };

    renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(screen.queryByTestId('smlMenu-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smlMenuError')).not.toBeInTheDocument();
    expect(screen.getByText('No matching results')).toBeInTheDocument();
  });

  it('still lists cached results when useSmlAutocomplete reports error', () => {
    mockUseSmlAutocompleteReturn = {
      results: defaultMockResults,
      total: defaultMockResults.length,
      isLoading: false,
      isError: true,
      error: new Error('stale'),
    };

    const { container } = renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(screen.queryByTestId('smlMenu-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smlMenuError')).not.toBeInTheDocument();
  });

  it('passes undefined constraints to useSmlAutocomplete when the agent has no connector constraints', () => {
    renderWithProvider(<Sml query="git" onSelect={jest.fn()} />);

    expect(mockUseSmlAutocomplete).toHaveBeenCalledWith('git', { constraints: undefined });
  });
});
