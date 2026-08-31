/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ROOT_CONTEXT,
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Span,
} from '@opentelemetry/api';
import { withInferenceContext } from '@kbn/inference-tracing';

/** OpenTelemetry's sentinel for "no valid trace" (a non-recording / no-op span). */
const INVALID_TRACE_ID = '00000000000000000000000000000000';

const evalsTracer = trace.getTracer('@kbn/evals');

/**
 * Normalizes a trace id coming from an active span or an upstream API response.
 * Returns `undefined` for a missing/empty id or OpenTelemetry's all-zero sentinel
 * (which the SDK hands back when tracing is disabled). Treating the sentinel as
 * "no trace" lets callers fail fast with a clear "no trace id" error instead of
 * grading a trace that does not exist.
 */
export const normalizeTraceId = (traceId: string | undefined): string | undefined =>
  traceId && traceId !== INVALID_TRACE_ID ? traceId : undefined;

/**
 * Returns the trace id of the currently active span, or `undefined` when no
 * real span is active (e.g. tracing is disabled and the SDK hands back a
 * non-recording span with an all-zero trace id).
 */
export const getCurrentTraceId = (): string | undefined =>
  normalizeTraceId(trace.getActiveSpan()?.spanContext().traceId);

/**
 * Runs `run` inside a fresh, active root span so the work under it emits a
 * correlatable trace. The span is rooted at a new context (baggage is preserved)
 * so each unit of work gets its own trace id — trace-based evaluators (tokens,
 * latency, tool calls) sum over `trace.id`, so isolating one trace per span
 * keeps those metrics scoped correctly.
 *
 * The whole thing runs inside {@link withInferenceContext}, which sets the
 * inference "tracking beacon" baggage. Without it, the inference client's
 * `createInferenceContext` sees no beacon, treats itself as a root, and calls
 * `trace.deleteSpan` — so the model's `gen_ai` span (which carries the token
 * usage attributes) breaks off into a *separate* trace. With the beacon present,
 * the `gen_ai`/`chat` span nests under this span and shares its trace id, so the
 * trace stays coherent (and self-describing) in the Tracing UI.
 */
const withEvalsRootSpan = <T>(
  name: string,
  attributes: Record<string, string>,
  run: () => Promise<T>
): Promise<T> =>
  withInferenceContext(() => {
    const baggage = propagation.getBaggage(context.active());
    const parentContext = baggage ? propagation.setBaggage(ROOT_CONTEXT, baggage) : ROOT_CONTEXT;

    return context.with(parentContext, () =>
      evalsTracer.startActiveSpan(
        name,
        { attributes: { 'instrumentationScope.name': '@kbn/evals', ...attributes } },
        async (span: Span) => {
          try {
            return await run();
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw error;
          } finally {
            span.end();
          }
        }
      )
    );
  });

/**
 * Wraps the feature under evaluation in a named "task" root span. The name is
 * the root shown in the Tracing UI, so it should be self-describing (e.g.
 * `task · direct model`). Mirrors the offline runner's `withTaskSpan`
 * (`@kbn/evals`).
 */
export const withEvalsTaskSpan = <T>(name: string, run: () => Promise<T>): Promise<T> =>
  withEvalsRootSpan(name, { 'task.name': name }, run);

/**
 * Prefix for LLM-as-a-judge root span names (`judge · <evaluator>`). Exported so
 * the Tracing routes can identify judge spans by name and keep them visible while
 * excluding other evaluator root spans (see `EXCLUDE_NON_JUDGE_EVALUATOR_ROOTS`).
 */
export const JUDGE_SPAN_NAME_PREFIX = 'judge · ';

/**
 * Wraps an LLM-as-a-judge evaluator in its own root span named
 * `judge · <evaluator>`. Without this, the judge's inference call forks into a
 * bare `chat <model>` root that's indistinguishable from a task trace in the
 * Tracing UI; rooting it here makes each judge self-describing, with the model's
 * `chat` span nested underneath. Only LLM evaluators need this — trace-metric
 * evaluators (latency, tokens, tool calls) run ES|QL and emit no model spans.
 */
export const withEvalsEvaluatorSpan = <T>(
  evaluatorName: string,
  run: () => Promise<T>
): Promise<T> =>
  withEvalsRootSpan(
    `${JUDGE_SPAN_NAME_PREFIX}${evaluatorName}`,
    { 'evaluator.name': evaluatorName },
    run
  );
