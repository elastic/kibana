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

const FIND_EXECUTION_PATH = '/internal/agent_builder/executions/_find';
const RESOLVED_AGENT_EXECUTION_ID = 'agent-exec-1';
const FOLLOW_PATH = `/internal/agent_builder/executions/${RESOLVED_AGENT_EXECUTION_ID}/follow`;

let mockEvents$: Observable<unknown>;
const mockGetExecution = jest.fn();
const mockFindAgentExecution = jest.fn();

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
    mockFindAgentExecution.mockReset().mockResolvedValue({
      executionId: RESOLVED_AGENT_EXECUTION_ID,
    });
  });

  const createHttp = () => {
    const get = jest.fn((path: string) => {
      if (path === FIND_EXECUTION_PATH) {
        return mockFindAgentExecution();
      }
      return Promise.resolve({});
    });
    return { get } as unknown as HttpSetup;
  };

  /** Waits until the hook has resolved the agent execution id and attached its follow stream. */
  const waitUntilFollowing = async (http: HttpSetup) => {
    await waitFor(() => {
      expect(http.get).toHaveBeenCalledWith(
        FOLLOW_PATH,
        expect.objectContaining({ asResponse: true, rawResponse: true })
      );
    });
  };

  it('does nothing when workflowExecutionId is undefined, deriving status from the input flag', () => {
    const http = createHttp();
    const { result } = renderHook(() =>
      useInvestigationState({ http, workflowExecutionId: undefined, isRunning: true })
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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
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
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
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
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
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
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: false })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(4000);
        });

        expect(result.current.status).toBe('running');
        expect(http.get).toHaveBeenCalledWith(
          FOLLOW_PATH,
          expect.objectContaining({ asResponse: true, rawResponse: true })
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('isRunning: true — resolve the agent execution id, follow live, settle via the workflow execution', () => {
    it('resolves the agent execution id by its workflow_execution_id metadata tag before following', async () => {
      const http = createHttp();
      const { result } = renderHook(() =>
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
      );

      expect(result.current.status).toBe('running');
      await waitUntilFollowing(http);

      expect(http.get).toHaveBeenCalledWith(
        FIND_EXECUTION_PATH,
        expect.objectContaining({
          query: { metadataKey: 'workflow_execution_id', metadataValue: 'exec-1' },
        })
      );
      expect(http.get).toHaveBeenCalledWith(
        FOLLOW_PATH,
        expect.objectContaining({ asResponse: true, rawResponse: true })
      );
    });

    it('polls the find-by-metadata endpoint until it resolves an id, without calling follow in between', async () => {
      jest.useFakeTimers();
      try {
        mockFindAgentExecution
          .mockResolvedValueOnce({ executionId: null })
          .mockResolvedValue({ executionId: RESOLVED_AGENT_EXECUTION_ID });
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
        expect(http.get).not.toHaveBeenCalledWith(FOLLOW_PATH, expect.anything());
        expect(result.current.status).toBe('running');

        await act(async () => {
          await jest.advanceTimersByTimeAsync(3000);
        });
        expect(http.get).toHaveBeenCalledWith(
          FOLLOW_PATH,
          expect.objectContaining({ asResponse: true, rawResponse: true })
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('applies validated investigation_progress snapshots once following', async () => {
      const http = createHttp();
      const { result } = renderHook(() =>
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
      );
      await waitUntilFollowing(http);

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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
      );
      await waitUntilFollowing(http);

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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
      );
      await waitUntilFollowing(http);

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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
      );
      await waitUntilFollowing(http);

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
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(0);
        });
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
        mockEvents$ = throwError(() => new Error('Execution not found'));
        mockGetExecution.mockResolvedValue({ status: 'running', stepExecutions: [] });
        const http = createHttp();

        const { result } = renderHook(() =>
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(4000);
        });

        expect(result.current.status).toBe('running');
        expect(result.current.error).toBeUndefined();
        expect(mockFindAgentExecution.mock.calls.length).toBeGreaterThan(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('re-resolves the agent execution id (not just re-follows the previous one) after a stream error', async () => {
      jest.useFakeTimers();
      try {
        const SECOND_AGENT_EXECUTION_ID = 'agent-exec-2';
        mockFindAgentExecution
          .mockResolvedValueOnce({ executionId: RESOLVED_AGENT_EXECUTION_ID })
          .mockResolvedValue({ executionId: SECOND_AGENT_EXECUTION_ID });
        mockEvents$ = throwError(() => new Error('stream boom'));
        mockGetExecution.mockResolvedValue({ status: 'running', stepExecutions: [] });
        const http = createHttp();

        renderHook(() =>
          useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(4000);
        });

        expect(http.get).toHaveBeenCalledWith(
          `/internal/agent_builder/executions/${SECOND_AGENT_EXECUTION_ID}/follow`,
          expect.objectContaining({ asResponse: true, rawResponse: true })
        );
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
        useInvestigationState({ http, workflowExecutionId: 'exec-1', isRunning: true })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('complete');
      });
      expect(result.current.state).toEqual(validState);
      expect(result.current.error).toBeUndefined();
    });
  });
});
