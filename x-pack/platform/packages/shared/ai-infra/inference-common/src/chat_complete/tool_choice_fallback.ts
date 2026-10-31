/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolChoiceType, type ToolChoice } from './tools';
import { createInferenceRequestError } from '../errors';

/**
 * Whether the tool choice forces a tool call (`required` or a named tool).
 */
export const isForcedToolChoice = (toolChoice: ToolChoice | undefined): boolean =>
  toolChoice !== undefined &&
  toolChoice !== ToolChoiceType.auto &&
  toolChoice !== ToolChoiceType.none;

const getErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { meta, status } = error as { meta?: { status?: unknown }; status?: unknown };
  const value = meta?.status ?? status;
  return typeof value === 'number' ? value : undefined;
};

/**
 * Detects the provider error returned when a model rejects a forced `tool_choice`, e.g.
 * `status [400] ... [tool_choice: type "tool" and "any" are not supported for this model.]`
 *
 * Requires an inference error status of 400 in addition to the message, so that unrelated
 * failures that merely mention `tool_choice` (auth, rate limit, 5xx...) are not retried.
 */
export const isUnsupportedToolChoiceError = (error: unknown): boolean => {
  if (getErrorStatus(error) !== 400) {
    return false;
  }
  const message = error instanceof Error ? error.message : '';
  return /tool_choice/i.test(message) && /not supported|unsupported|not allowed/i.test(message);
};

const MAX_REJECTED_ENTRIES = 500;
const rejectedToolChoice = new Set<string>();

const toKey = ({ connectorId, model }: { connectorId: string; model?: string }) =>
  `${connectorId}::${model ?? ''}`;

/**
 * Single decision point for "should we send a forced `tool_choice` to this connector/model?".
 *
 * Today it only consults the process-lifetime memo of confirmed rejections. A static list of
 * models known to reject forced tool choices can be plugged in here without touching the
 * callers (`InferenceChatModel` and `createOutputApi`).
 */
export const shouldForceToolChoice = (target: { connectorId: string; model?: string }): boolean =>
  !rejectedToolChoice.has(toKey(target));

/**
 * Remembers, for the rest of the process lifetime, that a connector/model rejected a forced
 * `tool_choice`, so later requests go straight to `auto`.
 */
export const recordToolChoiceRejection = (target: { connectorId: string; model?: string }) => {
  const key = toKey(target);
  if (rejectedToolChoice.has(key)) {
    return;
  }
  if (rejectedToolChoice.size >= MAX_REJECTED_ENTRIES) {
    const oldest = rejectedToolChoice.values().next().value;
    if (oldest !== undefined) {
      rejectedToolChoice.delete(oldest);
    }
  }
  rejectedToolChoice.add(key);
};

/** @internal test helper */
export const resetToolChoiceRejections = () => rejectedToolChoice.clear();

/**
 * Explicit error thrown when the `auto` fallback is rejected too, so callers see which model
 * cannot be used instead of the raw provider 400.
 */
export const createForcedToolChoiceUnsupportedError = (modelLabel: string, error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  return createInferenceRequestError(
    `Model "${modelLabel}" does not support tool_choice: forced tool_choice unsupported, and the ` +
      `fallback to tool_choice "auto" was rejected too. ${reason}`,
    400
  );
};

export const getToolChoiceFallbackInstruction = (toolChoice: ToolChoice | undefined): string =>
  toolChoice && typeof toolChoice === 'object'
    ? `You MUST respond by calling the "${toolChoice.function}" tool. Do not reply with plain text.`
    : 'You MUST respond by calling one of the provided tools. Do not reply with plain text.';

/**
 * Whether the request carries tools and forces a tool call, i.e. whether the `auto` fallback
 * applies to it.
 */
export const hasForcedToolChoice = (request: {
  tools?: Record<string, unknown>;
  toolChoice?: ToolChoice;
}): boolean =>
  isForcedToolChoice(request.toolChoice) && Object.keys(request.tools ?? {}).length > 0;

/**
 * Rewrites a request with a forced tool choice to `auto`, keeping the tools and instructing the
 * model (via the system prompt) to call the tool.
 */
export const toAutoToolChoiceRequest = <T extends { toolChoice?: ToolChoice; system?: string }>(
  request: T
): T & { system: string } => {
  const instruction = getToolChoiceFallbackInstruction(request.toolChoice);
  return {
    ...request,
    toolChoice: ToolChoiceType.auto,
    system: request.system ? `${request.system}\n\n${instruction}` : instruction,
  };
};
