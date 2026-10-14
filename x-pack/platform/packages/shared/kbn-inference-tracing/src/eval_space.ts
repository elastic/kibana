/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from '@opentelemetry/api';
import { context, createContextKey } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';

/** Span attribute the collector and Elasticsearch's `_otlp` endpoint route the data stream namespace on. */
export const DATA_STREAM_NAMESPACE_ATTRIBUTE = 'data_stream.namespace';

/**
 * The space is kept as an OpenTelemetry context value rather than baggage on purpose:
 * baggage is extracted from inbound `baggage` headers, so a caller could set it and route
 * spans into another space's traces. A context value only ever comes from code in this process.
 */
const EVAL_SPACE_ID_CONTEXT_KEY = createContextKey('kibana.evals.space_id');

export const getEvalSpaceId = (ctx: Context): string | undefined => {
  const value = ctx.getValue(EVAL_SPACE_ID_CONTEXT_KEY);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/** Returns `ctx` with the eval space set, or `ctx` itself when no space is given. */
export const setEvalSpaceId = (ctx: Context, spaceId: string | undefined): Context =>
  spaceId ? ctx.setValue(EVAL_SPACE_ID_CONTEXT_KEY, spaceId) : ctx;

/**
 * Runs `fn` so every span it starts is routed to the traces data stream of `spaceId`
 * (see {@link EvalSpaceSpanProcessor}). Without a space it just runs `fn`.
 */
export const withEvalSpace = <T>(spaceId: string | undefined, fn: () => T): T =>
  spaceId ? context.with(setEvalSpaceId(context.active(), spaceId), fn) : fn();

/**
 * Copies the eval space from the active context onto a context built from scratch, such as
 * the fresh root contexts eval spans start from.
 */
export const carryEvalSpaceId = (target: Context): Context =>
  setEvalSpaceId(target, getEvalSpaceId(context.active()));

/**
 * Sets `data_stream.namespace` on spans started in a context that has an eval space, so
 * the collector (and `_otlp`) writes them to `traces-<dataset>-<spaceId>`. A span that
 * already names a namespace, as Agent Builder's do, is left alone.
 */
export class EvalSpaceSpanProcessor implements tracing.SpanProcessor {
  onStart(span: tracing.Span, parentContext: Context): void {
    if (!span.isRecording?.()) {
      return;
    }

    const spaceId = getEvalSpaceId(parentContext);
    if (!spaceId || span.attributes[DATA_STREAM_NAMESPACE_ATTRIBUTE] !== undefined) {
      return;
    }

    span.setAttribute(DATA_STREAM_NAMESPACE_ATTRIBUTE, spaceId);
  }

  onEnd(): void {}

  async forceFlush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}
