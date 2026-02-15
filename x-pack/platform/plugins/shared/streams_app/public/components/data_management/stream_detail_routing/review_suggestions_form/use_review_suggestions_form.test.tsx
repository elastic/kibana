/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useReviewSuggestionsForm } from './use_review_suggestions_form';
import type { Condition } from '@kbn/streamlang';
import { useFetchErrorToast } from '../../../../hooks/use_fetch_error_toast';

jest.mock('react-use/lib/useUpdateEffect', () => {
  return (cb: () => void, deps: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactImport = require('react');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactImport.useEffect(cb, deps as any);
  };
});

const mockStreamsRepositoryClient = {
  stream: jest.fn(),
};

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        streams: { streamsRepositoryClient: mockStreamsRepositoryClient },
      },
    },
  }),
}));

// Mock the abort controller hook
jest.mock('@kbn/react-hooks', () => ({
  useAbortController: () => ({
    signal: new AbortController().signal,
    abort: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock the error toast function
const mockShowFetchErrorToast = jest.fn();
jest.mock('../../../../hooks/use_fetch_error_toast', () => ({
  useFetchErrorToast: () => mockShowFetchErrorToast,
}));

// Mock the actor ref hook; capture sent events for assertions
const mockSend = jest.fn();
jest.mock('../state_management/stream_routing_state_machine', () => ({
  useStreamsRoutingActorRef: () => ({ send: mockSend }),
  useStreamsRoutingSelector: () => 'test-stream',
}));

const condition: Condition = { field: 'service.name', eq: 'api' };

const setupSuggestionsApi = () => {
  const mockResponse = {
    partitions: [
      { name: 'logs.api', condition },
      { name: 'logs.ui', condition },
    ],
  };

  // Mock the Observable stream
  const mockObservable = {
    subscribe: jest.fn((observer) => {
      observer.next(mockResponse);
      observer.complete();
    }),
  };
  mockStreamsRepositoryClient.stream.mockReturnValue(mockObservable);
  return mockResponse;
};

describe('useReviewSuggestionsForm', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockStreamsRepositoryClient.stream.mockReset();
    mockShowFetchErrorToast.mockReset();
  });

  it('initializes with undefined suggestions and not loading', () => {
    const { result } = renderHook(() => useReviewSuggestionsForm());
    expect(result.current.suggestions).toBeUndefined();
    expect(result.current.isLoadingSuggestions).toBe(false);
  });

  it('fetchSuggestions calls the API and sets suggestions', async () => {
    const mockResponse = setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    expect(mockStreamsRepositoryClient.stream).toHaveBeenCalledWith(
      'POST /internal/streams/{name}/_suggest_partitions',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        params: {
          path: { name: 'test-stream' },
          body: {
            connector_id: 'test-connector',
            start: 0,
            end: 1000,
          },
        },
      })
    );
    expect(result.current.suggestions).toEqual(mockResponse.partitions);
  });

  it('resetForm clears suggestions and sends suggestion.preview blank event', async () => {
    setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // First set some suggestions directly
    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    // Then reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.suggestions).toBeUndefined();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        condition: { always: {} },
        name: '',
        index: 0,
        toggle: false,
      })
    );
  });

  it('previewSuggestion sends suggestion.preview event with toggle', async () => {
    setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // First set some suggestions directly
    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    act(() => {
      result.current.previewSuggestion(0, true);
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        condition,
        name: 'logs.api',
        index: 0,
        toggle: true,
      })
    );
  });

  it('acceptSuggestion removes the suggestion', async () => {
    const mockResponse = setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // First set some suggestions directly
    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    act(() => {
      result.current.acceptSuggestion(0);
    });

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions).toEqual(mockResponse.partitions.slice(1));
  });

  it('rejectSuggestion removes the suggestion without preview reset when isSelectedPreview is false', async () => {
    setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // First set some suggestions directly
    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    // Reset mock after setup to ignore any calls during initialization
    mockSend.mockReset();

    act(() => {
      result.current.rejectSuggestion(0, false);
    });

    expect(mockSend).not.toHaveBeenCalled();
    expect(result.current.suggestions).toHaveLength(1);
  });

  it('rejectSuggestion resets preview and removes the suggestion when isSelectedPreview is true', async () => {
    setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // First set some suggestions directly
    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    act(() => {
      result.current.rejectSuggestion(0, true);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        condition: { always: {} },
        name: '',
        index: 0,
        toggle: false,
      })
    );
    expect(result.current.suggestions).toHaveLength(1);
  });

  it('removeSuggestion resets form when all suggestions are removed', async () => {
    setupSuggestionsApi();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // Set single suggestion
    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    // Remove both suggestions
    act(() => {
      result.current.removeSuggestion(0);
    });
    act(() => {
      result.current.removeSuggestion(0);
    });

    expect(result.current.suggestions).toBeUndefined();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suggestion.preview',
        condition: { always: {} },
        name: '',
        index: 0,
        toggle: false,
      })
    );
  });

  it('fetchSuggestions handles errors and shows error toast', async () => {
    const error = new Error('API Error');

    // Mock Observable that throws an error
    const mockObservable = {
      subscribe: jest.fn((observer) => {
        observer.error(error);
      }),
    };
    mockStreamsRepositoryClient.stream.mockReturnValue(mockObservable);
    const showFetchErrorToast = useFetchErrorToast();

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    expect(showFetchErrorToast).toHaveBeenCalledWith(error);
    expect(result.current.isLoadingSuggestions).toBe(false);
  });

  it('fetchSuggestions does not show error toast for AbortError', async () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';

    // Mock Observable that throws an AbortError
    const mockObservable = {
      subscribe: jest.fn((observer) => {
        observer.error(abortError);
      }),
    };
    mockStreamsRepositoryClient.stream.mockReturnValue(mockObservable);

    const { result } = renderHook(() => useReviewSuggestionsForm());
    const showFetchErrorToast = useFetchErrorToast();

    await act(async () => {
      await result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    expect(showFetchErrorToast).not.toHaveBeenCalled();
    expect(result.current.isLoadingSuggestions).toBe(false);
  });

  it('sets loading state during fetchSuggestions', async () => {
    let resolveObserver: () => void;
    const mockObservable = {
      subscribe: jest.fn((observer) => {
        resolveObserver = () => {
          observer.next({ partitions: [] });
          observer.complete();
        };
      }),
    };
    mockStreamsRepositoryClient.stream.mockReturnValue(mockObservable);

    const { result } = renderHook(() => useReviewSuggestionsForm());

    // Start fetch
    act(() => {
      result.current.fetchSuggestions({
        streamName: 'test-stream',
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    expect(result.current.isLoadingSuggestions).toBe(true);

    // Resolve the observable
    await act(async () => {
      if (resolveObserver) {
        resolveObserver();
      }
    });

    expect(result.current.isLoadingSuggestions).toBe(false);
  });
});
