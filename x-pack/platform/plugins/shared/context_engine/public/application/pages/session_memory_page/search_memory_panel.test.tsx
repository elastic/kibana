/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { useSearchSessionMemory } from '../../hooks/use_session_memory_mutations';
import { SearchMemoryPanel } from './search_memory_panel';
import { buildSessionContext, pngFile, renderWithProviders } from './test_helpers';

jest.mock('../../hooks/use_session_memory_mutations', () => ({
  useSearchSessionMemory: jest.fn(),
}));

const mockUseSearchSessionMemory = jest.mocked(useSearchSessionMemory);

const mutationResult = (overrides = {}) =>
  ({ mutate: jest.fn(), isLoading: false, data: undefined, ...overrides } as unknown as ReturnType<
    typeof useSearchSessionMemory
  >);

const memory = {
  id: 'm-1',
  '@timestamp': '2026-01-01T00:00:00.000Z',
  session_id: 's-1',
  user_id: 'u-1',
  agent_id: 'a-1',
};

describe('SearchMemoryPanel', () => {
  beforeEach(() => {
    mockUseSearchSessionMemory.mockReturnValue(mutationResult());
  });

  afterEach(() => jest.clearAllMocks());

  it('searches by text, scoped to the current user and space by default', () => {
    const mutate = jest.fn();
    mockUseSearchSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<SearchMemoryPanel />);

    expect(screen.getByTestId('contextSessionMemorySearch-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('contextSessionMemorySearch-text'), {
      target: { value: 'dark mode' },
    });
    fireEvent.change(screen.getByTestId('contextSessionMemorySearch-size'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-submit'));

    expect(mutate).toHaveBeenCalledWith({
      query: 'dark mode',
      user_id: 'kathleen',
      space: 'default',
      size: 5,
    });
  });

  it('applies the session, agent, and AI index filters when checked', () => {
    const mutate = jest.fn();
    mockUseSearchSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<SearchMemoryPanel />, {
      session: buildSessionContext({ aiIndexIds: ['support'] }),
    });

    fireEvent.change(screen.getByTestId('contextSessionMemorySearch-text'), {
      target: { value: 'dark mode' },
    });
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-filter-user'));
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-filter-session'));
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-filter-agent'));
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-filter-aiIndex'));
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-submit'));

    expect(mutate).toHaveBeenCalledWith({
      query: 'dark mode',
      session_id: 'session-1',
      agent_id: 'elastic-agent',
      space: 'default',
      ai_index_id: 'support',
      size: 10,
    });
  });

  it('disables the AI index filter unless exactly one AI index is selected', () => {
    const { unmount } = renderWithProviders(<SearchMemoryPanel />);
    expect(screen.getByTestId('contextSessionMemorySearch-filter-aiIndex')).toBeDisabled();
    unmount();

    renderWithProviders(<SearchMemoryPanel />, {
      session: buildSessionContext({ aiIndexIds: ['support', 'sales'] }),
    });
    expect(screen.getByTestId('contextSessionMemorySearch-filter-aiIndex')).toBeDisabled();
    expect(screen.getByText(/select a single index to filter/)).toBeInTheDocument();
  });

  it('searches by an uploaded image', async () => {
    const mutate = jest.fn();
    mockUseSearchSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<SearchMemoryPanel />);

    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-mode-image'));
    fireEvent.change(screen.getByTestId('contextSessionMemorySearch-image'), {
      target: { files: [pngFile()] },
    });
    await screen.findByTestId('contextSessionMemorySearch-image-preview');
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-submit'));

    expect(mutate).toHaveBeenCalledWith({
      query: { type: 'image', value: 'data:image/png;base64,iVBORw==', format: 'base64' },
      user_id: 'kathleen',
      space: 'default',
      size: 10,
    });
  });

  it('renders each hit with its score, content, and image preview', () => {
    mockUseSearchSessionMemory.mockReturnValue(
      mutationResult({
        data: {
          count: 2,
          results: [
            { _score: 0.91234, memory: { ...memory, content: 'Prefers dark mode' } },
            {
              _score: 0.5,
              memory: {
                ...memory,
                id: 'm-2',
                media: [{ type: 'image', value: 'https://example.com/pic.png', format: 'url' }],
              },
            },
          ],
        },
      })
    );
    renderWithProviders(<SearchMemoryPanel />);

    expect(screen.getAllByTestId('contextSessionMemoryResult')).toHaveLength(2);
    expect(screen.getAllByTestId('contextSessionMemoryResult-score')[0]).toHaveTextContent('0.912');
    expect(screen.getByTestId('contextSessionMemoryResult-content')).toHaveTextContent(
      'Prefers dark mode'
    );
    expect(screen.getByTestId('contextSessionMemoryResult-image')).toHaveAttribute(
      'src',
      'https://example.com/pic.png'
    );
  });

  it('shows the empty prompt when nothing matches', () => {
    mockUseSearchSessionMemory.mockReturnValue(mutationResult({ data: { count: 0, results: [] } }));
    renderWithProviders(<SearchMemoryPanel />);

    expect(screen.getByTestId('contextSessionMemorySearch-empty')).toBeInTheDocument();
  });
});
