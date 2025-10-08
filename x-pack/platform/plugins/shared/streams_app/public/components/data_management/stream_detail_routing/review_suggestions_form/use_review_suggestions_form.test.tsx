/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useReviewSuggestionsForm } from './use_review_suggestions_form';
import type { AsyncState } from 'react-use/lib/useAsync';
import type { Condition } from '@kbn/streamlang';

jest.mock('react-use/lib/useUpdateEffect', () => {
  return (cb: () => void, deps: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactImport = require('react');
    ReactImport.useEffect(cb, deps as any);
  };
});

// Mock the fetch hook so we can control loading + value + invocation
const mockFetchSuggestionsFn = jest.fn();
let mockSuggestedPartitionsState: AsyncState<any> = { loading: false, value: undefined };
jest.mock('./use_fetch_suggested_partitions', () => ({
  useFetchSuggestedPartitions: () =>
    [mockSuggestedPartitionsState, mockFetchSuggestionsFn] as const,
}));

// Mock the actor ref hook; capture sent events for assertions
const mockSend = jest.fn();
jest.mock('../state_management/stream_routing_state_machine', () => ({
  useStreamsRoutingActorRef: () => ({ send: mockSend }),
}));

const condition: Condition = { field: 'service.name', eq: 'api' };

describe('useReviewSuggestionsForm', () => {
  beforeEach(() => {
    mockSuggestedPartitionsState = { loading: false, value: undefined }; // reset to initial
    mockSend.mockReset();
    mockFetchSuggestionsFn.mockReset();
  });

  it('initializes with empty suggestions and not loading', () => {
    const { result } = renderHook(() => useReviewSuggestionsForm());
    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.isLoadingSuggestions).toBe(false);
    expect(result.current.isEmpty).toBeFalsy(); // value undefined so isEmpty should be false (not fetched yet)
  });

  it('sets suggestions when fetch hook provides value', () => {
    mockSuggestedPartitionsState = {
      loading: false,
      value: {
        partitions: [
          { id: '1', name: 'logs-api', condition, selected: true },
          { id: '2', name: 'logs-ui', condition, selected: false },
        ],
      },
    };
    const { result } = renderHook(() => useReviewSuggestionsForm());
    expect(result.current.suggestions.map((s) => s.name)).toEqual(['logs-api', 'logs-ui']);
  });

  it('resetForm triggers fetchSuggestions(null) and sends suggestion.preview blank event', () => {
    const { result } = renderHook(() => useReviewSuggestionsForm());
    act(() => {
      result.current.resetForm();
    });
    expect(mockFetchSuggestionsFn).toHaveBeenCalledWith(null);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        name: '',
        index: 0,
        toggle: false,
      })
    );
  });

  it('previewSuggestion sends suggestion.preview event with toggle', () => {
    mockSuggestedPartitionsState = {
      loading: false,
      value: { partitions: [{ id: '1', name: 'logs-api', condition }] },
    };
    const { result } = renderHook(() => useReviewSuggestionsForm());
    act(() => {
      result.current.previewSuggestion(0, true);
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        name: 'logs-api',
        index: 0,
        toggle: true,
      })
    );
  });

  it('acceptSuggestion removes the suggestion', () => {
    mockSuggestedPartitionsState = {
      loading: false,
      value: { partitions: [{ id: '1', name: 'logs-api', condition }] },
    };
    const { result } = renderHook(() => useReviewSuggestionsForm());
    act(() => {
      result.current.acceptSuggestion(0);
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'suggestion.preview', name: '', index: 0 })
    );
  });

  it('rejectSuggestion sends preview (toggle false) and removes the suggestion', () => {
    mockSuggestedPartitionsState = {
      loading: false,
      value: { partitions: [{ id: '1', name: 'logs-api', condition }] },
    };
    const { result } = renderHook(() => useReviewSuggestionsForm());
    act(() => {
      result.current.rejectSuggestion(0);
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        name: 'logs-api',
        index: 0,
        toggle: false,
      })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'suggestion.preview', name: '', index: 0 })
    );
  });

  it('isEmpty becomes true when suggestions array emptied after having value', () => {
    mockSuggestedPartitionsState = {
      loading: false,
      value: { partitions: [{ id: '1', name: 'logs-api', condition }] },
    };
    const { result, rerender } = renderHook(() => useReviewSuggestionsForm());
    expect(result.current.isEmpty).toBe(false);
    act(() => {
      result.current.rejectSuggestion(0);
    });
    rerender();
    expect(result.current.isEmpty).toBe(true);
  });
});
