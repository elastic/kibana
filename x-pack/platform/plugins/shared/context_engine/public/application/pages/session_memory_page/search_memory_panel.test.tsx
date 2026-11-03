/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import {
  useListSessionMemory,
  useSearchSessionMemory,
} from '../../hooks/use_session_memory_mutations';
import { SearchMemoryPanel } from './search_memory_panel';
import { buildSessionContext, pdfFile, pngFile, renderWithProviders } from './test_helpers';

jest.mock('../../hooks/use_session_memory_mutations', () => ({
  useListSessionMemory: jest.fn(),
  useSearchSessionMemory: jest.fn(),
}));

const mockUseSearchSessionMemory = jest.mocked(useSearchSessionMemory);
const mockUseListSessionMemory = jest.mocked(useListSessionMemory);

type MutationResult = ReturnType<typeof useSearchSessionMemory> &
  ReturnType<typeof useListSessionMemory>;

const mutationResult = (overrides = {}) =>
  ({
    mutate: jest.fn(),
    isLoading: false,
    data: undefined,
    ...overrides,
  } as unknown as MutationResult);

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
    mockUseListSessionMemory.mockReturnValue(mutationResult());
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

    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-mode-file'));
    fireEvent.change(screen.getByTestId('contextSessionMemorySearch-file'), {
      target: { files: [pngFile()] },
    });
    await screen.findByTestId('contextSessionMemorySearch-file-preview');
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-submit'));

    expect(mutate).toHaveBeenCalledWith({
      query: { type: 'image', value: 'data:image/png;base64,iVBORw==', format: 'base64' },
      user_id: 'kathleen',
      space: 'default',
      size: 10,
    });
  });

  it('searches by an uploaded PDF', async () => {
    const mutate = jest.fn();
    mockUseSearchSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<SearchMemoryPanel />);

    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-mode-file'));
    fireEvent.change(screen.getByTestId('contextSessionMemorySearch-file'), {
      target: { files: [pdfFile()] },
    });
    await screen.findByTestId('contextSessionMemorySearch-file-pdf');
    expect(screen.getByTestId('contextSessionMemorySearch-file-pdf')).toHaveTextContent('deck.pdf');
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-submit'));

    expect(mutate).toHaveBeenCalledWith({
      query: { type: 'pdf', value: 'data:application/pdf;base64,JVBERg==', format: 'base64' },
      user_id: 'kathleen',
      space: 'default',
      size: 10,
    });
  });

  it('lists memories matching the filters through the list endpoint', () => {
    const mutate = jest.fn();
    mockUseListSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<SearchMemoryPanel />);

    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-mode-list'));
    expect(screen.queryByTestId('contextSessionMemorySearch-text')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextSessionMemorySearch-submit')).toBeEnabled();
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-filter-session'));
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-submit'));

    expect(mutate).toHaveBeenCalledWith({
      user_id: 'kathleen',
      session_id: 'session-1',
      space: 'default',
      size: 10,
    });
  });

  it('renders a listing newest first without scores', () => {
    mockUseListSessionMemory.mockReturnValue(
      mutationResult({
        data: {
          count: 2,
          results: [
            { ...memory, content: 'Newer' },
            { ...memory, id: 'm-2', content: 'Older' },
          ],
        },
      })
    );
    renderWithProviders(<SearchMemoryPanel />);
    fireEvent.click(screen.getByTestId('contextSessionMemorySearch-mode-list'));

    expect(screen.getByTestId('contextSessionMemorySearch-count')).toHaveTextContent(
      '2 memories, newest first'
    );
    expect(screen.getAllByTestId('contextSessionMemoryResult')).toHaveLength(2);
    expect(screen.queryAllByTestId('contextSessionMemoryResult-score')).toHaveLength(0);
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

    expect(screen.getByTestId('contextSessionMemorySearch-count')).toHaveTextContent(
      '2 matches, best first'
    );
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

  it('expands a result to its raw JSON with long media values shortened', () => {
    const value = `data:image/png;base64,${'A'.repeat(200)}`;
    mockUseSearchSessionMemory.mockReturnValue(
      mutationResult({
        data: {
          count: 1,
          results: [
            {
              _score: 1,
              memory: {
                ...memory,
                attributes: { source: 'chat' },
                media: [{ type: 'image', value, format: 'base64' }],
              },
            },
          ],
        },
      })
    );
    renderWithProviders(<SearchMemoryPanel />);

    const json = screen.getByTestId('contextSessionMemoryResult-json');
    expect(json).toHaveTextContent('"source": "chat"');
    expect(json).toHaveTextContent('… (222 chars)');
    expect(json).not.toHaveTextContent('A'.repeat(100));
  });

  it('shows the empty prompt when nothing matches', () => {
    mockUseSearchSessionMemory.mockReturnValue(mutationResult({ data: { count: 0, results: [] } }));
    renderWithProviders(<SearchMemoryPanel />);

    expect(screen.getByTestId('contextSessionMemorySearch-empty')).toBeInTheDocument();
  });
});
