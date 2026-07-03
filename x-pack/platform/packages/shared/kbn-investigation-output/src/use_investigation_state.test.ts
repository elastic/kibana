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
  /**
   * Subscribes to the source (so the http.get() side effect still happens), but replaces
   * its output with the test-controlled `mockEvents$` observable.
   */
  httpResponseIntoObservable: () => (source: { subscribe: (o: unknown) => void }) => {
    source.subscribe({ error: () => {} });
    return mockEvents$;
  },
}));

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({ getExecution: mockGetExecution })),
}));

const validState = { summary: 'ok', hypotheses: [] };

const completedExecutionWithOutput = (output: unknown) => ({
  status: 'completed',
  stepExecutions: [{ stepId: 'investigate', output }],
});

const progressEvent = (state: unknown) => ({
  type: ChatEventType.toolUi,
  data: {
    tool_id: 'x',
    tool_call_id: 'y',
    custom_event: INVESTIGATION_PROGRESS_UI_EVENT,
    data: state,
  },
});

describe('useInvestigationState', () => {
  let mockSubject: Subject<unknown>;

  beforeEach(() => {
    mockSubject = new Subject();
    mockEvents$ = mockSubject;
    mockGetExecution.mockReset();
  });

  const createHttp = () => ({ get: jest.fn().mockResolvedValue({}) } as unknown as HttpSetup);

  it('does nothing when executionId is undefined, deriving status from the input flag', () => {
    const http = createHttp();
    const { result } = renderHook(() =>
      useInvestigationState({ http, executionId: undefined, isRunning: true })
    );

    expect(http.get).not.toHaveBeenCalled();
    expect(mockGetExecution).not.toHaveBeenCalled();
    expect(result.current.status).toBe('running');
  });

  describe('isRunning: false — fetch the persisted result, no SSE', () => {
    it('fetches and parses the final structured_output', async () => {
      mockGetExecution.mockResolvedValue(
        completedExecutionWithOutput({ message: 'ok', structured_output: validState })
      );
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      expect(result.current.status).toBe('loading');
      expect(http.get).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(result.current.state).toEqual(validState);
      });
      expect(result.current.status).toBe('complete');
      expect(result.current.error).toBeUndefined();
      expect(mockGetExecution).toHaveBeenCalledWith('exec-1', { includeOutput: true });
    });

    it('reports failed with the step error when the investigate step failed', async () => {
      mockGetExecution.mockResolvedValue({
        status: 'failed',
        stepExecutions: [{ stepId: 'investigate', error: { message: 'No connector configured' } }],
      });
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });
      expect(result.current.error).toBe('No connector configured');
      expect(result.current.state).toBeUndefined();
    });

    it('reports failed when the workflow failed without an investigate step error', async () => {
      mockGetExecution.mockResolvedValue({ status: 'failed', stepExecutions: [] });
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });
      expect(result.current.error).toBe('The investigation did not complete.');
    });

    it('retries a completed execution whose output is not visible yet, then reports unavailable', async () => {
      jest.useFakeTimers();
      try {
        mockGetExecution.mockResolvedValue(completedExecutionWithOutput({ message: 'ok' }));
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(5000);
        });

        expect(mockGetExecution.mock.calls.length).toBeGreaterThan(1);
        expect(result.current.status).toBe('unavailable');
        expect(result.current.error).toBe("Couldn't load the investigation result.");
      } finally {
        jest.useRealTimers();
      }
    });

    it('recovers when a retry sees the output land after the persistence flush', async () => {
      jest.useFakeTimers();
      try {
        mockGetExecution
          .mockResolvedValueOnce(completedExecutionWithOutput({ message: 'ok' }))
          .mockResolvedValue(
            completedExecutionWithOutput({ message: 'ok', structured_output: validState })
          );
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(2000);
        });

        expect(result.current.status).toBe('complete');
        expect(result.current.state).toEqual(validState);
      } finally {
        jest.useRealTimers();
      }
    });

    it('reports a permissions message when the fetch is forbidden', async () => {
      mockGetExecution.mockRejectedValue(
        Object.assign(new Error('Forbidden'), { body: { statusCode: 403, message: 'Forbidden' } })
      );
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('unavailable');
      });
      expect(result.current.error).toBe(
        "You don't have permission to view the investigation result."
      );
    });

    it('resumes following live when the workflow execution is actually still running', async () => {
      jest.useFakeTimers();
      try {
        mockGetExecution.mockResolvedValue({ status: 'running', stepExecutions: [] });
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, executionId: 'exec-1', isRunning: false })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(4000);
        });

        expect(result.current.status).toBe('running');
        expect(http.get).toHaveBeenCalledWith(
          '/internal/agent_builder/executions/exec-1/follow',
          expect.objectContaining({ asResponse: true, rawResponse: true })
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('isRunning: true — follow live, settle via the workflow execution', () => {
    it('follows the execution and applies validated investigation_progress snapshots', async () => {
      const http = createHttp();
      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      expect(http.get).toHaveBeenCalledWith(
        '/internal/agent_builder/executions/exec-1/follow',
        expect.objectContaining({ asResponse: true, rawResponse: true })
      );
      expect(result.current.status).toBe('running');

      const snapshot = { summary: 'Gathering evidence.', hypotheses: [] };
      act(() => {
        mockSubject.next(progressEvent(snapshot));
      });

      await waitFor(() => {
        expect(result.current.state).toEqual(snapshot);
      });
    });

    it('ignores malformed progress payloads instead of rendering them', async () => {
      const http = createHttp();
      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      const snapshot = { summary: 'valid', hypotheses: [] };
      act(() => {
        mockSubject.next(progressEvent(snapshot));
        mockSubject.next(progressEvent({ nonsense: true }));
      });

      await waitFor(() => {
        expect(result.current.state).toEqual(snapshot);
      });
    });

    it('replaces the previous state wholesale with each snapshot', async () => {
      const http = createHttp();
      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      const hypothesisA = { candidate: 'A', confidence: 0.4, status: 'investigating' as const };
      const hypothesisB = { candidate: 'B', confidence: 0.5, status: 'investigating' as const };
      act(() => {
        mockSubject.next(
          progressEvent({ summary: 'both', hypotheses: [hypothesisA, hypothesisB] })
        );
        mockSubject.next(progressEvent({ summary: 'partial', hypotheses: [hypothesisB] }));
      });

      await waitFor(() => {
        expect(result.current.state?.summary).toBe('partial');
      });
      expect(result.current.state?.hypotheses).toEqual([hypothesisB]);
    });

    it('prefers the fetched final result over the last live value on stream completion', async () => {
      const finalState = { summary: 'final', hypotheses: [] };
      mockGetExecution.mockResolvedValue(
        completedExecutionWithOutput({ message: 'ok', structured_output: finalState })
      );
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      act(() => {
        mockSubject.next(progressEvent({ summary: 'live', hypotheses: [] }));
        mockSubject.complete();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('complete');
      });
      expect(result.current.state).toEqual(finalState);
    });

    it('waits for the workflow to become terminal when the stream completes before the engine finishes', async () => {
      jest.useFakeTimers();
      try {
        const finalState = { summary: 'final', hypotheses: [] };
        mockGetExecution
          .mockResolvedValueOnce({ status: 'running', stepExecutions: [] })
          .mockResolvedValue(
            completedExecutionWithOutput({ message: 'ok', structured_output: finalState })
          );
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
        );

        act(() => {
          mockSubject.complete();
        });
        await act(async () => {
          await jest.advanceTimersByTimeAsync(2000);
        });

        expect(result.current.status).toBe('complete');
        expect(result.current.state).toEqual(finalState);
      } finally {
        jest.useRealTimers();
      }
    });

    it('re-follows instead of failing when the stream errors while the workflow still runs', async () => {
      jest.useFakeTimers();
      try {
        mockEvents$ = throwError(() => new Error('Execution exec-1 not found'));
        mockGetExecution.mockResolvedValue({ status: 'running', stepExecutions: [] });
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(4000);
        });

        expect(result.current.status).toBe('running');
        expect(result.current.error).toBeUndefined();
        expect((http.get as jest.Mock).mock.calls.length).toBeGreaterThan(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('settles from the persisted result when the stream errors and the workflow is terminal', async () => {
      mockEvents$ = throwError(() => new Error('stream boom'));
      mockGetExecution.mockResolvedValue(
        completedExecutionWithOutput({ message: 'ok', structured_output: validState })
      );
      const http = createHttp();

      const { result } = renderHook(() =>
        useInvestigationState({ http, executionId: 'exec-1', isRunning: true })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('complete');
      });
      expect(result.current.state).toEqual(validState);
      expect(result.current.error).toBeUndefined();
    });
  });
});
