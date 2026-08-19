/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Sml } from './sml';
import { CommandId } from '../../types';
import type { CommandMenuHandle } from '../../types';

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

  it('calls onSelect with SML command id, entry id, and type/title label when a row is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(<Sml query="" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Pacific Sales'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      commandId: CommandId.Sml,
      id: 'entry-1',
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

  describe('reporting content presence via onContentChange', () => {
    it('reports content when there are results, for the current query', () => {
      const onContentChange = jest.fn();
      renderWithProvider(<Sml query="" onSelect={jest.fn()} onContentChange={onContentChange} />);

      expect(onContentChange).toHaveBeenCalledWith(true, '');
    });

    it('reports content while still loading, even with zero results so far', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: true,
        isError: false,
        error: null,
      };
      const onContentChange = jest.fn();
      renderWithProvider(
        <Sml query="nosuchthing" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(true, 'nosuchthing');
    });

    it('reports no content once results are confirmed empty, for the current query', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: false,
        isError: false,
        error: null,
      };
      const onContentChange = jest.fn();
      renderWithProvider(
        <Sml query="nosuchthing" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(false, 'nosuchthing');
    });
  });

  describe('select on space for "type/name" queries', () => {
    it('selects the match on Space once the exact name is typed', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="visualization/Pacific Sales" onSelect={onSelect} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(true);

      act(() => {
        ref.current!.handleKeyDown({ key: ' ' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Sml,
        id: 'entry-1',
        label: 'visualization/Pacific Sales',
        metadata: {},
      });
    });

    it('does not claim Space for a partial name with no exact match yet, so it types through normally', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/Pac" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not claim Space when there are zero candidates at all — it types through and the mention just ends', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: false,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/nosuchthing" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not claim Space while the very first fetch is still loading', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: true,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/nosuchthing" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not select on Space for a bare trailing slash with no name yet', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not select on Space for a plain free-text query with no slash', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="Pacific Sales" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('selects the exact name match, not whichever result the API ranked first', () => {
      mockUseSmlAutocompleteReturn = {
        results: [
          { id: 'connector-2', origin_id: 'att-2', type: 'connector', title: 'workday_2' },
          { id: 'connector-1', origin_id: 'att-1', type: 'connector', title: 'workday' },
        ],
        total: 2,
        isLoading: false,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="connector/workday" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: ' ' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Sml,
        id: 'connector-1',
        label: 'connector/workday',
        metadata: {},
      });
    });

    it('respects explicit arrow-key navigation away from the exact match', () => {
      mockUseSmlAutocompleteReturn = {
        results: [
          { id: 'connector-2', origin_id: 'att-2', type: 'connector', title: 'workday_2' },
          { id: 'connector-1', origin_id: 'att-1', type: 'connector', title: 'workday' },
        ],
        total: 2,
        isLoading: false,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="connector/workday" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: ' ' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Sml,
        id: 'connector-2',
        label: 'connector/workday_2',
        metadata: {},
      });
    });
  });
});
