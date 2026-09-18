/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedErrorCause, SerializedExecutionError } from '@kbn/agent-builder-common';
import {
  AgentBuilderErrorCode,
  createAgentBuilderError,
  isAgentBuilderError,
  type AgentBuilderError,
} from '@kbn/agent-builder-common';

/**
 * Converts an unknown error to a {@link SerializedExecutionError} for persistence.
 * - If the error is already an AgentBuilderError, serializes it using toJSON().
 * - Otherwise, wraps it as an internalError, preserving the HTTP status from
 *   Boom-style errors (or any error carrying a numeric `statusCode`) in
 *   `meta.statusCode` so the route layer can return the correct code.
 */
export const serializeExecutionError = (error: unknown): SerializedExecutionError => {
  const causes = serializeCauses(error);
  if (isAgentBuilderError(error)) {
    return {
      code: error.code as AgentBuilderErrorCode,
      message: error.message,
      meta: error.meta,
      ...(causes.length > 0 ? { causes } : {}),
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = getHttpStatusFromError(error);
  return {
    code: AgentBuilderErrorCode.internalError,
    message,
    ...(statusCode !== undefined ? { meta: { statusCode } } : {}),
    ...(causes.length > 0 ? { causes } : {}),
  };
};

/** How deep a `cause` chain is followed; guards against cycles and runaway wrapping. */
export const MAX_SERIALIZED_CAUSES = 5;
/** Per-cause message bound, so a huge upstream payload cannot bloat the stored error. */
export const MAX_SERIALIZED_CAUSE_MESSAGE_LENGTH = 1_000;

/**
 * Walks `error.cause` and serializes each link, outermost first: the wrapped failure is usually
 * the actionable part of the message, and the wrapper alone rarely says anything useful.
 */
export const serializeCauses = (error: unknown): SerializedErrorCause[] => {
  const causes: SerializedErrorCause[] = [];
  const seen = new Set<unknown>([error]);
  let current: unknown =
    typeof error === 'object' && error !== null ? (error as Error).cause : undefined;
  while (current !== undefined && current !== null && causes.length < MAX_SERIALIZED_CAUSES) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    causes.push(serializeCause(current));
    current = typeof current === 'object' ? (current as Error).cause : undefined;
  }
  return causes;
};

const serializeCause = (cause: unknown): SerializedErrorCause => {
  const rawMessage = cause instanceof Error ? cause.message : String(cause);
  const message =
    rawMessage.length > MAX_SERIALIZED_CAUSE_MESSAGE_LENGTH
      ? `${rawMessage.slice(0, MAX_SERIALIZED_CAUSE_MESSAGE_LENGTH)}…`
      : rawMessage;
  const code = (cause as { code?: unknown } | null)?.code;
  return {
    ...(cause instanceof Error && cause.name ? { name: cause.name } : {}),
    message,
    ...(typeof code === 'string' ? { code } : {}),
  };
};

/** A validated 4xx/5xx status carried by a Boom-style error or a plain `statusCode` field. */
export const getHttpStatusFromError = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { output, statusCode } = error as {
    output?: { statusCode?: unknown };
    statusCode?: unknown;
  };
  const candidate =
    typeof output?.statusCode === 'number'
      ? output.statusCode
      : typeof statusCode === 'number'
      ? statusCode
      : undefined;
  return typeof candidate === 'number' && candidate >= 400 && candidate < 600
    ? candidate
    : undefined;
};

/**
 * Rebuilds an `AgentBuilderError` from its serialized form, including the `cause` chain, so that
 * re-serializing it (e.g. a follower surfacing an execution document's error) loses nothing.
 */
export const deserializeExecutionError = (
  serialized: SerializedExecutionError
): AgentBuilderError<AgentBuilderErrorCode> => {
  const error = createAgentBuilderError(serialized.code, serialized.message, serialized.meta);
  const causes = serialized.causes ?? [];
  let cause: (Error & { code?: string }) | undefined;
  for (const link of [...causes].reverse()) {
    const next: Error & { code?: string; cause?: unknown } = new Error(link.message);
    if (link.name) {
      next.name = link.name;
    }
    if (link.code) {
      next.code = link.code;
    }
    if (cause) {
      next.cause = cause;
    }
    cause = next;
  }
  if (cause) {
    (error as Error & { cause?: unknown }).cause = cause;
  }
  return error;
};
