/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useReviewSuggestionsForm } from './use_review_suggestions_form';
import type { Condition } from '@kbn/streamlang';
import { TaskStatus } from '@kbn/streams-schema';

jest.mock('react-use/lib/useUpdateEffect', () => {
  return (cb: () => void, deps: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactImport = require('react');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactImport.useEffect(cb, deps as any);
  };
});

const mockGetPartitionSuggestionStatus = jest.fn();
const mockSchedulePartitionSuggestionTask = jest.fn();
const mockCancelPartitionSuggestionTask = jest.fn();
const mockAcknowledgePartitionSuggestionTask = jest.fn();

jest.mock('../../../../hooks/use_partition_suggestion_api', () => ({
  usePartitionSuggestionApi: () => ({
    getPartitionSuggestionStatus: mockGetPartitionSuggestionStatus,
    schedulePartitionSuggestionTask: mockSchedulePartitionSuggestionTask,
    cancelPartitionSuggestionTask: mockCancelPartitionSuggestionTask,
    acknowledgePartitionSuggestionTask: mockAcknowledgePartitionSuggestionTask,
  }),
}));

const mockShowFetchErrorToast = jest.fn();
jest.mock('../../../../hooks/use_fetch_error_toast', () => ({
  useFetchErrorToast: () => mockShowFetchErrorToast,
}));

const mockSend = jest.fn();
jest.mock('../state_management/stream_routing_state_machine', () => ({
  useStreamsRoutingActorRef: () => ({ send: mockSend }),
  useStreamsRoutingSelector: (
    selector: (snapshot: { context: { definition: { stream: { name: string } } } }) => string
  ) => selector({ context: { definition: { stream: { name: 'test-stream' } } } }),
}));

jest.mock('../../../../hooks/use_task_polling', () => ({
  useTaskPolling: jest.fn(),
}));

const condition: Condition = { field: 'service.name', eq: 'api' };

const mockPartitions = [
  { name: 'logs.api', condition },
  { name: 'logs.ui', condition },
];

const createTaskResponse = (
  status: TaskStatus,
  partitions?: typeof mockPartitions,
  error?: string
) => ({
  status,
  ...(partitions && { partitions }),
  ...(error && { error }),
});

describe('useReviewSuggestionsForm', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetPartitionSuggestionStatus.mockReset();
    mockSchedulePartitionSuggestionTask.mockReset();
    mockCancelPartitionSuggestionTask.mockReset();
    mockAcknowledgePartitionSuggestionTask.mockReset();
    mockShowFetchErrorToast.mockReset();

    mockGetPartitionSuggestionStatus.mockResolvedValue(createTaskResponse(TaskStatus.NotStarted));
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockCancelPartitionSuggestionTask.mockResolvedValue(undefined);
  });

  it('initializes with undefined suggestions and not loading', () => {
    const { result } = renderHook(() => useReviewSuggestionsForm());
    expect(result.current.suggestions).toBeUndefined();
  });

  it('fetchSuggestions schedules task and retrieves status', async () => {
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(createTaskResponse(TaskStatus.InProgress));

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    expect(mockSchedulePartitionSuggestionTask).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      start: 0,
      end: 1000,
    });
  });

  it('sets suggestions when task completes', async () => {
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
    });
  });

  it('resetForm clears suggestions and sends suggestion.preview blank event', async () => {
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
    });

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
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
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
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
    });

    act(() => {
      result.current.acceptSuggestion(0);
    });

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions).toEqual(mockPartitions.slice(1));
  });

  it('rejectSuggestion removes the suggestion without preview reset when isSelectedPreview is false', async () => {
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
    });

    mockSend.mockReset();

    act(() => {
      result.current.rejectSuggestion(0, false);
    });

    expect(mockSend).not.toHaveBeenCalled();
    expect(result.current.suggestions).toHaveLength(1);
  });

  it('rejectSuggestion resets preview and removes the suggestion when isSelectedPreview is true', async () => {
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
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
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Completed, mockPartitions)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockPartitions);
    });

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

  it('shows error toast when task fails', async () => {
    const errorMessage = 'Task failed';
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.Failed, undefined, errorMessage)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(mockShowFetchErrorToast).toHaveBeenCalledWith(new Error(errorMessage));
    });
  });

  it('shows error toast when getStatus fails', async () => {
    const error = new Error('Network error');
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockRejectedValue(error);

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(mockShowFetchErrorToast).toHaveBeenCalledWith(error);
    });
  });

  it('does not show error toast for AbortError during schedule', async () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    mockSchedulePartitionSuggestionTask.mockRejectedValue(abortError);

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    expect(mockShowFetchErrorToast).not.toHaveBeenCalled();
  });

  it('isLoadingSuggestions is true when task is in progress', async () => {
    mockSchedulePartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(createTaskResponse(TaskStatus.InProgress));

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.fetchSuggestions({
        connectorId: 'test-connector',
        start: 0,
        end: 1000,
      });
    });

    await waitFor(() => {
      expect(result.current.task?.status).toBe(TaskStatus.InProgress);
    });

    expect(result.current.isLoadingSuggestions).toBe(true);
  });

  it('isLoadingSuggestions is true when task is being canceled', async () => {
    mockCancelPartitionSuggestionTask.mockResolvedValue(undefined);
    mockGetPartitionSuggestionStatus.mockResolvedValue(
      createTaskResponse(TaskStatus.BeingCanceled)
    );

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.cancelSuggestions();
    });

    await waitFor(() => {
      expect(result.current.task?.status).toBe(TaskStatus.BeingCanceled);
    });

    expect(result.current.isLoadingSuggestions).toBe(true);
  });

  it('cancelSuggestions calls cancel action', async () => {
    mockGetPartitionSuggestionStatus.mockResolvedValue(createTaskResponse(TaskStatus.InProgress));
    mockCancelPartitionSuggestionTask.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviewSuggestionsForm());

    await act(async () => {
      await result.current.cancelSuggestions();
    });

    expect(mockCancelPartitionSuggestionTask).toHaveBeenCalled();
  });
});
