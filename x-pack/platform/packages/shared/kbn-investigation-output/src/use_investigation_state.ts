/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { defer, catchError, throwError } from 'rxjs';
import type { MonoTypeOperatorFunction } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { isSSEError } from '@kbn/sse-utils';
import { isToolUiEvent } from '@kbn/agent-builder-common';
import type { ChatEvent, AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { createAgentBuilderError } from '@kbn/agent-builder-common';
import { WorkflowApi } from '@kbn/workflows-ui';
import { i18n } from '@kbn/i18n';
import {
  INVESTIGATION_PROGRESS_UI_EVENT,
  investigationStateSchema,
  type InvestigationState,
} from '@kbn/significant-events-schema';

/** Name of the `investigate` step in `investigation_workflow.yaml` — must stay in sync with it. */
const INVESTIGATE_STEP_ID = 'investigate';

/** Converts SSE-envelope errors emitted by the agent execution follow stream into thrown errors. */
function unwrapAgentExecutionErrors<T>(): MonoTypeOperatorFunction<T> {
  return catchError((err) => {
    if (isSSEError(err)) {
      return throwError(() =>
        createAgentBuilderError(err.code as AgentBuilderErrorCode, err.message, err.meta)
      );
    }
    return throwError(() => err);
  });
}

export interface UseInvestigationStateResult {
  /** Latest known investigation state, live while running or persisted once fetched. */
  state?: InvestigationState;
  /** True while actively following the live stream; false once settled (fetched or errored). */
  isRunning: boolean;
  /** Set when the investigation itself failed, or when the result couldn't be loaded/parsed. */
  error?: string;
}

/**
 * Surfaces the current state of an investigation, live or completed, from a single source:
 * `investigationStateSchema` — the same schema the investigation agent streams via
 * `investigation_progress` `tool_ui` events AND the schema of the `investigate` step's final
 * structured output persisted to the workflow execution document.
 *
 * - While `isRunning` is true, follows the agent execution's live event stream
 *   (`GET /internal/agent_builder/executions/{executionId}/follow`) and treats each event's
 *   payload as the full current state (a snapshot, never a delta).
 * - The caller's `isRunning` flag can lag reality (e.g. a significant event's cached
 *   "still running" state after the agent already finished or failed), and the agent's last
 *   `tool_ui` call isn't guaranteed to equal the final structured output. So on BOTH stream
 *   `error` and stream `complete` — not just when the caller says it's done — this fetches the
 *   persisted final result via `WorkflowApi` and prefers it over the last live value. If that
 *   fetch itself fails (e.g. missing `workflowsManagement:readExecution` privilege, or the step
 *   failed), it degrades to `error` instead of throwing, keeping whatever `state` is already known.
 *
 * `executionId` must be the id of the underlying agent execution — the investigation workflow
 * pins this to its own workflow execution id (see `investigation_workflow.yaml`), so the workflow
 * execution id can be passed directly for both the live-follow and the fetch-final path.
 */
export function useInvestigationState({
  http,
  executionId,
  isRunning: isRunningInput,
  enabled = true,
}: {
  http: HttpSetup;
  executionId: string | undefined;
  /** Whether the caller believes the investigation is still running. May lag reality. */
  isRunning: boolean;
  /** Set to false to skip entirely (e.g. no execution to show yet). */
  enabled?: boolean;
}): UseInvestigationStateResult {
  const [state, setState] = useState<InvestigationState | undefined>();
  const [isRunning, setIsRunning] = useState(isRunningInput);
  const [error, setError] = useState<string | undefined>();
  const httpRef = useRef(http);
  httpRef.current = http;

  useEffect(() => {
    if (!executionId || !enabled) {
      return;
    }

    let cancelled = false;

    const fetchFinal = async () => {
      try {
        const workflowApi = new WorkflowApi(httpRef.current);
        const execution = await workflowApi.getExecution(executionId, { includeOutput: true });
        const stepExecution = execution.stepExecutions?.find(
          (step) => step.stepId === INVESTIGATE_STEP_ID
        );

        if (cancelled) {
          return;
        }

        if (stepExecution?.error) {
          setError(stepExecution.error.message);
          setIsRunning(false);
          return;
        }

        const output = stepExecution?.output as { structured_output?: unknown } | undefined;
        const parsed = investigationStateSchema.safeParse(output?.structured_output);

        if (parsed.success) {
          setState(parsed.data);
          setError(undefined);
        } else {
          setError(
            i18n.translate('xpack.investigationOutput.couldNotLoadResultErrorMessage', {
              defaultMessage: "Couldn't load the investigation result.",
            })
          );
        }
        setIsRunning(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsRunning(false);
        }
      }
    };

    if (!isRunningInput) {
      setIsRunning(false);
      fetchFinal();
      return () => {
        cancelled = true;
      };
    }

    setState(undefined);
    setIsRunning(true);
    setError(undefined);

    const abortController = new AbortController();

    const subscription = defer(() =>
      httpRef.current.get(`/internal/agent_builder/executions/${executionId}/follow`, {
        signal: abortController.signal,
        asResponse: true,
        rawResponse: true,
      })
    )
      .pipe(
        // @ts-expect-error SseEvent mixin issue, see chat_service.ts in agent_builder
        httpResponseIntoObservable<ChatEvent>(),
        unwrapAgentExecutionErrors()
      )
      .subscribe({
        next: (event) => {
          if (isToolUiEvent(event, INVESTIGATION_PROGRESS_UI_EVENT)) {
            setState(event.data.data as InvestigationState);
          }
        },
        // Stream errored (e.g. the agent execution itself failed) — fall back to the persisted
        // result rather than surfacing the raw stream error.
        error: () => fetchFinal(),
        // The stream completing means the agent execution is done, but its last progress
        // snapshot may not equal the final structured output — fetch it to be sure.
        complete: () => fetchFinal(),
      });

    return () => {
      cancelled = true;
      abortController.abort();
      subscription.unsubscribe();
    };
  }, [executionId, enabled, isRunningInput]);

  return { state, isRunning, error };
}
