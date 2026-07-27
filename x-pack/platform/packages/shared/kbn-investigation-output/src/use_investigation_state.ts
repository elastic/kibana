/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { defer } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { isToolUiEvent } from '@kbn/agent-builder-common';
import { WorkflowApi } from '@kbn/workflows-ui';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  INVESTIGATE_STEP_ID,
  INVESTIGATION_PROGRESS_UI_EVENT,
  investigationStateSchema,
  type InvestigationState,
} from '@kbn/significant-events-schema';
import type { InvestigationStatus } from './types';

/**
 * Path of the internal route that resolves the agent execution tagged with a given metadata
 * key/value pair to its (auto-generated) execution id. See `executions.ts`'s `_find` route.
 */
const FIND_EXECUTION_PATH = '/internal/agent_builder/executions/_find';
/** Metadata key the investigation workflow tags its agent execution with (see the YAML). */
const WORKFLOW_EXECUTION_ID_METADATA_KEY = 'workflow_execution_id';

/**
 * How long to wait before retrying to attach to the live agent execution — either because it
 * hasn't been created yet (the metadata lookup found nothing) or because a stream that was
 * attached errored while the workflow execution is still running (e.g. the follow endpoint's
 * idle/total timeout kicked in mid-run, or a step retry replaced the agent execution).
 */
const REFOLLOW_DELAY_MS = 3000;
/**
 * How long to wait between attempts to read the final result while the workflow engine is
 * still persisting it (its persistence loop flushes every ~500ms after the agent stream ends).
 */
const SETTLE_RETRY_DELAY_MS = 1000;
/** Retry attempts for a terminal-but-output-not-yet-visible execution before giving up. */
const MAX_SETTLE_ATTEMPTS = 3;

const COULD_NOT_LOAD_MESSAGE = i18n.translate(
  'xpack.investigationOutput.couldNotLoadResultErrorMessage',
  { defaultMessage: "Couldn't load the investigation result." }
);
const MISSING_PRIVILEGES_MESSAGE = i18n.translate(
  'xpack.investigationOutput.missingPrivilegesErrorMessage',
  { defaultMessage: "You don't have permission to view the investigation result." }
);
const FAILED_WITHOUT_DETAILS_MESSAGE = i18n.translate(
  'xpack.investigationOutput.failedWithoutDetailsErrorMessage',
  { defaultMessage: 'The investigation did not complete.' }
);

const httpErrorMessage = (err: Error): string => {
  const fetchError = err as IHttpFetchError<ResponseErrorBody>;
  if (fetchError.response?.status === 403 || fetchError.body?.statusCode === 403) {
    return MISSING_PRIVILEGES_MESSAGE;
  }
  return fetchError.body?.message ?? err.message;
};

type SettledInvestigation =
  | { status: 'complete'; state: InvestigationState }
  | { status: 'failed'; error: string }
  | { status: 'unavailable'; error: string };

export interface UseInvestigationStateResult {
  /** Latest known investigation state: live snapshots while running, persisted once complete. */
  state?: InvestigationState;
  status: InvestigationStatus;
  /** Detail message for the `failed` and `unavailable` statuses. */
  error?: string;
  /** Agent builder conversation id created by the investigation step, if available. */
  conversationId?: string;
}

/**
 * Surfaces the current state of an investigation, live or completed, from a single source:
 * `investigationStateSchema` — the same schema the investigation agent streams via
 * `investigation_progress` `tool_ui` events AND the schema of the `investigate` step's final
 * structured output persisted to the workflow execution document.
 *
 * - While the investigation runs, the underlying agent execution's id isn't known upfront (it's
 *   auto-generated) — the workflow tags it with `workflowExecutionId` as metadata instead of
 *   pinning it (agent execution ids must stay unique; see `investigation_workflow.yaml`). This
 *   hook resolves that tag to the live execution id via the `_find` route, then follows its
 *   event stream (`GET /internal/agent_builder/executions/{executionId}/follow`); each event
 *   carries the full current state (validated). If resolution finds nothing yet (the `ai.agent`
 *   step hasn't started), or an attached stream errors while the workflow is still running (the
 *   follow endpoint's timeout, or a step retry replacing the agent execution), it retries the
 *   resolve-then-follow sequence from scratch.
 * - When the stream ends (or the caller already knows the run is over), reads the persisted
 *   final result via `WorkflowApi`, keyed by `workflowExecutionId` — but only trusts it once the
 *   workflow execution itself is terminal. A just-completed execution whose output hasn't been
 *   persisted yet is retried briefly instead of being reported as unloadable.
 * - The investigation *failing* (`failed`, with the step's error) is distinguished from its
 *   result being *unloadable* (`unavailable`, e.g. missing privileges) — see
 *   {@link InvestigationStatus}.
 */
export function useInvestigationState({
  http,
  workflowExecutionId,
  isRunning: isRunningInput,
}: {
  http: HttpSetup;
  workflowExecutionId: string | undefined;
  /** Whether the caller believes the investigation is still running. May lag reality. */
  isRunning: boolean;
}): UseInvestigationStateResult {
  const [state, setState] = useState<InvestigationState | undefined>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [settled, setSettled] = useState<
    { status: 'complete' | 'failed' | 'unavailable'; error?: string } | undefined
  >();
  const [isFollowing, setIsFollowing] = useState(false);
  const lastExecutionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!workflowExecutionId) {
      return;
    }

    if (lastExecutionIdRef.current !== workflowExecutionId) {
      lastExecutionIdRef.current = workflowExecutionId;
      setState(undefined);
      setConversationId(undefined);
    }
    setSettled(undefined);
    setIsFollowing(false);

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: Subscription | undefined;
    const abortController = new AbortController();
    const workflowApi = new WorkflowApi(http);

    const applySettled = (result: SettledInvestigation) => {
      if (cancelled) {
        return;
      }
      setIsFollowing(false);
      if (result.status === 'complete') {
        setState(result.state);
        setSettled({ status: 'complete' });
      } else {
        setSettled({ status: result.status, error: result.error });
      }
    };

    /**
     * Reads the persisted result off the workflow execution and decides what to do based on the
     * execution's own status — never on what the caller or the stream believed:
     * - execution still running + the stream broke (`streamEnded: false`) → resume following;
     * - execution still running + the stream completed cleanly → the agent is done but the
     *   engine is still finishing the workflow; poll until it's terminal;
     * - terminal → report `complete` / `failed` / `unavailable`, retrying briefly when a
     *   completed execution's output isn't visible yet (persistence-flush race).
     */
    const settle = async ({
      streamEnded,
      attempt = 0,
    }: {
      streamEnded: boolean;
      attempt?: number;
    }) => {
      try {
        const execution = await workflowApi.getExecution(workflowExecutionId, {
          includeOutput: true,
        });
        if (cancelled) {
          return;
        }

        if (!isTerminalStatus(execution.status)) {
          if (streamEnded) {
            retryTimer = setTimeout(() => settle({ streamEnded: true }), SETTLE_RETRY_DELAY_MS);
          } else {
            setIsFollowing(true);
            retryTimer = setTimeout(followLive, REFOLLOW_DELAY_MS);
          }
          return;
        }

        const stepExecution = execution.stepExecutions?.find(
          (step) => step.stepId === INVESTIGATE_STEP_ID
        );

        if (stepExecution?.error) {
          applySettled({ status: 'failed', error: stepExecution.error.message });
          return;
        }

        const output = stepExecution?.output as
          | { structured_output?: unknown; conversation_id?: string }
          | undefined;
        if (output?.conversation_id) {
          setConversationId(output.conversation_id);
        }
        const parsed = investigationStateSchema.safeParse(output?.structured_output);

        if (parsed.success) {
          applySettled({ status: 'complete', state: parsed.data });
          return;
        }

        if (execution.status !== ExecutionStatus.COMPLETED) {
          applySettled({ status: 'failed', error: FAILED_WITHOUT_DETAILS_MESSAGE });
          return;
        }

        if (attempt < MAX_SETTLE_ATTEMPTS) {
          retryTimer = setTimeout(
            () => settle({ streamEnded, attempt: attempt + 1 }),
            SETTLE_RETRY_DELAY_MS
          );
          return;
        }

        applySettled({ status: 'unavailable', error: COULD_NOT_LOAD_MESSAGE });
      } catch (err) {
        if (!cancelled) {
          applySettled({
            status: 'unavailable',
            error: err instanceof Error ? httpErrorMessage(err) : String(err),
          });
        }
      }
    };

    /**
     * Resolves the live agent execution's (auto-generated) id from the `workflowExecutionId`
     * tag the workflow stamped on it as metadata — see `investigation_workflow.yaml`. Returns
     * `null` when no execution has been tagged yet (the `ai.agent` step hasn't started).
     */
    const resolveAgentExecutionId = async (): Promise<string | null> => {
      const response = await http.get<{ executionId: string | null }>(FIND_EXECUTION_PATH, {
        query: {
          metadataKey: WORKFLOW_EXECUTION_ID_METADATA_KEY,
          metadataValue: workflowExecutionId,
        },
        signal: abortController.signal,
      });
      return response.executionId;
    };

    const followLive = async () => {
      if (cancelled) {
        return;
      }
      setIsFollowing(true);

      const agentExecutionId = await resolveAgentExecutionId().catch(() => null);
      if (cancelled) {
        return;
      }
      if (!agentExecutionId) {
        retryTimer = setTimeout(followLive, REFOLLOW_DELAY_MS);
        return;
      }

      subscription = defer(() =>
        http.get(`/internal/agent_builder/executions/${agentExecutionId}/follow`, {
          signal: abortController.signal,
          asResponse: true,
          rawResponse: true,
        })
      )
        .pipe(
          /** `ChatEvent` doesn't satisfy the SSE event mixin constraint, and only `tool_ui`
           * events are consumed here — `isToolUiEvent` narrows from this minimal shape. */
          httpResponseIntoObservable<ServerSentEventBase<string, { data: unknown }>>()
        )
        .subscribe({
          next: (event) => {
            if (isToolUiEvent(event, INVESTIGATION_PROGRESS_UI_EVENT)) {
              const parsed = investigationStateSchema.safeParse(event.data.data);
              if (parsed.success) {
                setState(parsed.data);
              }
            }
          },
          error: () => settle({ streamEnded: false }),
          complete: () => settle({ streamEnded: true }),
        });
    };

    if (isRunningInput) {
      followLive();
    } else {
      settle({ streamEnded: false });
    }

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      abortController.abort();
      subscription?.unsubscribe();
    };
  }, [http, workflowExecutionId, isRunningInput]);

  const status: InvestigationStatus =
    settled?.status ?? (isFollowing || isRunningInput ? 'running' : 'loading');

  return { state, status, error: settled?.error, conversationId };
}
