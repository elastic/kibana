/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { Subject, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { ChatEventType } from '@kbn/agent-builder-common';
import { INVESTIGATION_PROGRESS_UI_EVENT } from '@kbn/significant-events-schema';
import { useInvestigationState } from './use_investigation_state';

let mockEvents$: Observable<unknown>;
const mockGetExecution = jest.fn();

jest.mock('@kbn/sse-utils-client', () => ({
  // Subscribes to the source (so the http.get() side effect still happens), but replaces
  // its output with the test-controlled `mockEvents$` observable.
  httpResponseIntoObservable: () => (source: { subscribe: (o: unknown) => void }) => {
    source.subscribe({ error: () => {} });
    return mockEvents$;
  },
}));

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({ getExecution: mockGetExecution })),
}));

const validState = { summary: 'ok', hypotheses: [] };

const executionWithOutput = (output: unknown) => ({
  stepExecutions: [{ stepId: 'investigate', output }],
});

describe('useInvestigationState', () => {
  let mockSubject: Subject<unknown>;

  beforeEach(() => {
    mockSubject = new Subject();
    mockEvents$ = mockSubject;
    mockGetExecution.mockReset();
  });

  const createHttp = () => ({ get: jest.fn().mockResolvedValue({}) } as unknown as HttpSetup);

  it('does nothing when executionId is undefined', () => {
    const http = createHttp();
    const { result } = renderHook(() =>
      useInvestigationState({ http, executionId: undefined, isRunning: true })
    );

    expect(http.get).not.toHaveBeenCalled();
    expect(mockGetExecution).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(true);
  });

  it('does nothing when disabled', () => {
    const http = createHttp();
    renderHook(() =>
      useInvestigationState({ http, executionId: 'exec-1', isRunning: true, enabled: false })
    );

    expect(http.get).not.toHaveBeenCalled();
    expect(mockGetExecution).not.toHaveBeenCalled();
  });

  describe('isRunning: false — fetch the persisted result, no SSE', () => {
    it('fetches and parses the final structured_output', async () => {
      mockGetExecution.mockResolvedValue(
        executionWithOutput({ message: 'ok', structured_output: validState })
      );
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      expect(http.get).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(result.current.state).toEqual(validState);
      });
      expect(result.current.isRunning).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('surfaces the step error when the investigate step failed', async () => {
      mockGetExecution.mockResolvedValue({
        stepExecutions: [{ stepId: 'investigate', error: { message: 'No connector configured' } }],
      });
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('No connector configured');
      });
      expect(result.current.state).toBeUndefined();
    });

    it('degrades gracefully when structured_output is missing or invalid', async () => {
      mockGetExecution.mockResolvedValue(executionWithOutput({ message: 'ok' }));
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Couldn't load the investigation result.");
      });
      expect(result.current.state).toBeUndefined();
    });

    it('degrades gracefully when the request itself fails (e.g. missing privilege)', async () => {
      mockGetExecution.mockRejectedValue(new Error('403 Forbidden'));
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('403 Forbidden');
      });
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('isRunning: true — follow live, with a fetch fallback', () => {
    it('follows the execution and surfaces investigation_progress tool_ui events as the full state', async () => {
      const http = createHttp();
      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      expect(http.get).toHaveBeenCalledWith(
        '/internal/agent_builder/executions/exec-1/follow',
        expect.objectContaining({ asResponse: true, rawResponse: true })
      );
      expect(result.current.isRunning).toBe(true);

      const state = { summary: 'Gathering evidence.', hypotheses: [] };
      act(() => {
        mockSubject.next({
          type: ChatEventType.toolUi,
          data: {
            tool_id: 'x',
            tool_call_id: 'y',
            custom_event: INVESTIGATION_PROGRESS_UI_EVENT,
            data: state,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.state).toEqual(state);
      });
    });

    it('falls back to the fetched result — preferring it over the last live value — on stream completion', async () => {
      const finalState = { summary: 'final', hypotheses: [] };
      mockGetExecution.mockResolvedValue(
        executionWithOutput({ message: 'ok', structured_output: finalState })
      );
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      const liveState = { summary: 'live', hypotheses: [] };
      act(() => {
        mockSubject.next({
          type: ChatEventType.toolUi,
          data: {
            tool_id: 'x',
            tool_call_id: 'y',
            custom_event: INVESTIGATION_PROGRESS_UI_EVENT,
            data: liveState,
          },
        });
        mockSubject.complete();
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });
      // The fetched final result wins over the last live snapshot.
      expect(result.current.state).toEqual(finalState);
      expect(mockGetExecution).toHaveBeenCalledWith('exec-1', { includeOutput: true });
    });

    it('falls back to fetching the final result when the stream itself errors', async () => {
      mockGetExecution.mockResolvedValue(
        executionWithOutput({ message: 'ok', structured_output: validState })
      );
      mockEvents$ = throwError(() => new Error('stream boom'));
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });
      expect(result.current.state).toEqual(validState);
      expect(result.current.error).toBeUndefined();
    });
  });
});
