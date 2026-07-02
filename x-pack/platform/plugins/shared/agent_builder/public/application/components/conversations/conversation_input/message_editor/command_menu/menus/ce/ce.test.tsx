/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Ce } from './ce';
import { CommandId } from '../../types';

const defaultMockResults = [
  {
    id: 'entry-1',
    origin_id: 'att-1',
    type: 'visualization',
    title: 'Pacific Sales',
  },
  {
    id: 'entry-2',
    origin_id: 'att-2',
    type: 'visualization',
    title: 'Atlantic Metrics',
  },
];

let mockUseCeAutocompleteReturn: {
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

const mockUseCeAutocomplete = jest.fn(() => mockUseCeAutocompleteReturn);

jest.mock('../../../../../../../hooks/ce/use_ce_autocomplete', () => ({
  useCeAutocomplete: (...args: unknown[]) => mockUseCeAutocomplete(...(args as [])),
}));

jest.mock('../../../../../../../hooks/use_conversation', () => ({
  useAgentId: () => 'test-agent-id',
}));

jest.mock('../../../../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: null, isLoading: false, error: null }),
}));

beforeEach(() => {
  mockUseCeAutocompleteReturn = {
    results: defaultMockResults,
    total: defaultMockResults.length,
    isLoading: false,
    isError: false,
    error: null,
  };
  mockUseCeAutocomplete.mockClear();
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('Ce', () => {
  it('renders CE autocomplete results as type/title', () => {
    const { container } = renderWithProvider(<Ce query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(container.textContent).toContain('visualization/Atlantic Metrics');
  });

  it('shows loading state when autocomplete is loading', () => {
    mockUseCeAutocompleteReturn = {
      results: [],
      total: 0,
      isLoading: true,
      isError: false,
      error: null,
    };

    renderWithProvider(<Ce query="" onSelect={jest.fn()} />);

    expect(screen.getByTestId('ceMenu-loading')).toBeInTheDocument();
  });

  it('calls onSelect with CE command id, entry id, and type/title label when a row is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(<Ce query="" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Pacific Sales'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      commandId: CommandId.Ce,
      id: 'entry-1',
      label: 'visualization/Pacific Sales',
      metadata: {},
    });
  });

  it('shows default empty list when autocomplete errors with no results', () => {
    mockUseCeAutocompleteReturn = {
      results: [],
      total: 0,
      isLoading: false,
      isError: true,
      error: new Error('network'),
    };

    renderWithProvider(<Ce query="" onSelect={jest.fn()} />);

    expect(screen.queryByTestId('ceMenu-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ceMenuError')).not.toBeInTheDocument();
    expect(screen.getByText('No matching results')).toBeInTheDocument();
  });

  it('still lists cached results when useCeAutocomplete reports error', () => {
    mockUseCeAutocompleteReturn = {
      results: defaultMockResults,
      total: defaultMockResults.length,
      isLoading: false,
      isError: true,
      error: new Error('stale'),
    };

    const { container } = renderWithProvider(<Ce query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(screen.queryByTestId('ceMenu-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ceMenuError')).not.toBeInTheDocument();
  });

  it('passes undefined constraints to useCeAutocomplete when the agent has no connector constraints', () => {
    renderWithProvider(<Ce query="git" onSelect={jest.fn()} />);

    expect(mockUseCeAutocomplete).toHaveBeenCalledWith('git', { constraints: undefined });
  });
});
