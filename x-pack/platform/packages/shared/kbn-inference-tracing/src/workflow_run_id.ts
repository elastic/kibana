/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, createContextKey } from '@opentelemetry/api';

/**
 * Span attribute stamped on inference spans emitted inside a workflow `ai.agent` step, carrying
 * the workflow execution's run id (`StepContext.execution.id`, i.e. the `.workflows-executions`
 * document id).
 *
 * The workflow execution engine's own trace id (from the `elastic-apm-node` transaction) and the
 * OTel trace id under which inference spans are emitted live in disconnected id spaces today (the
 * APM agent's `opentelemetryBridgeEnabled` defaults to `false` and Kibana does not override it),
 * so a span-side `trace.id` can never equal the workflow-side `traceIds` value. This attribute is
 * an independent join key: match `.workflows-executions._id` against it, hashing the document id
 * with `toHashedId` when `agentBuilder:tracing:includeRealIds` is off, exactly like
 * `elastic.workflow.execution_id`.
 */
export const WORKFLOW_RUN_ID_ATTRIBUTE_NAME = 'kibana.workflows.run_id';

const WORKFLOW_RUN_ID_CONTEXT_KEY = createContextKey(WORKFLOW_RUN_ID_ATTRIBUTE_NAME);

export function getWorkflowRunIdFromContext(ctx = context.active()): string | undefined {
  return ctx.getValue(WORKFLOW_RUN_ID_CONTEXT_KEY) as string | undefined;
}

/**
 * Runs `cb` in an OTel context carrying the workflow run id, so every inference span created
 * inside it is stamped with {@link WORKFLOW_RUN_ID_ATTRIBUTE_NAME}.
 *
 * Deliberately a plain context value rather than W3C baggage: Kibana registers
 * `W3CBaggagePropagator` globally (`initTracing`), and the HTTP/undici instrumentations inject the
 * active baggage into outbound request headers. A run id carried in baggage would therefore be
 * sent to every connector and model provider called inside `cb` — including when
 * `agentBuilder:tracing:includeRealIds` is off, which is exactly the case that setting anonymizes.
 * A non-propagating context value stays in-process, which is all this join needs: the workflow
 * engine and the agent spans live in the same Kibana.
 */
export function withWorkflowRunIdContext<T>(workflowRunId: string | undefined, cb: () => T): T {
  if (!workflowRunId) {
    return cb();
  }

  return context.with(context.active().setValue(WORKFLOW_RUN_ID_CONTEXT_KEY, workflowRunId), cb);
}
