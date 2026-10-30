/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum number of response characters kept in `EmptyModelResponseError.responsePreview`. */
export const MAX_RESPONSE_PREVIEW_LENGTH = 500;

/**
 * Stable code that lets a caller classify an empty completion without importing the error class
 * (errors are frequently re-wrapped on their way through LangChain).
 */
export const EMPTY_MODEL_RESPONSE_ERROR_CODE = 'EMPTY_MODEL_RESPONSE';

/**
 * Leading phrase of every `EmptyModelResponseError` message.
 *
 * Exported so that consumers which can only inspect a persisted message string (Attack Discovery
 * stores the failure text, not the error object) can match on the same phrase the error is built
 * from. The phrase is written once, here: a second copy in another package would drift silently and
 * a drifted copy stops matching, which re-introduces the misleading "send fewer alerts" remedy.
 */
export const EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX = 'the model returned an empty response';

/**
 * Returns a bounded preview of a model response. The preview can contain text derived from alert
 * content, so callers keep it off persisted and telemetry sinks (error messages, `state.errors`)
 * and only hand it to debug logging or an in-memory debugger.
 */
export const getBoundedResponsePreview = (
  responseBody: string,
  maxLength: number = MAX_RESPONSE_PREVIEW_LENGTH
): string =>
  responseBody.length > maxLength
    ? `${responseBody.slice(0, maxLength)}... (truncated, ${responseBody.length} characters total)`
    : responseBody;

export interface EmptyModelResponseErrorParams {
  /** Completion token count reported by the model, when the connector reports one. */
  completionTokens?: number;
  connectorId: string;
  /** Length of the response body that was returned. */
  contentLength: number;
  /** Model name the connector resolved to, when known. */
  model?: string;
  /** Prompt token count reported by the model, when the connector reports one. */
  promptTokens?: number;
  /** The response body that was returned; only a bounded preview of it is retained, off `message`. */
  responseBody: string;
  traceId?: string;
}

/**
 * Raised when a model returns a successful (HTTP 200) completion that contains no content.
 *
 * Without this guard an empty completion is returned as an empty string, and the caller fails much
 * later on something unrelated (for Attack Discovery, `JSON.parse('')` throws
 * `SyntaxError: Unexpected end of JSON input`), which hides both the real cause and the connector
 * that produced it.
 *
 * Carries the connector, model, token counts and trace id so the failure is actionable from the
 * persisted error alone. `message` is built from those diagnostics only, because it reaches persisted
 * and telemetry sinks and the response can contain alert-derived text; the bounded response preview is
 * exposed as `responsePreview` for debug logging instead.
 */
export class EmptyModelResponseError extends Error {
  public readonly code = EMPTY_MODEL_RESPONSE_ERROR_CODE;
  public readonly completionTokens?: number;
  public readonly connectorId: string;
  public readonly contentLength: number;
  public readonly model?: string;
  public readonly promptTokens?: number;
  /** Bounded prefix of the response. Never part of `message`; do not log above debug level. */
  public readonly responsePreview: string;
  public readonly traceId?: string;

  constructor({
    completionTokens,
    connectorId,
    contentLength,
    model,
    promptTokens,
    responseBody,
    traceId,
  }: EmptyModelResponseErrorParams) {
    super(
      `${EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX} (code: ${EMPTY_MODEL_RESPONSE_ERROR_CODE}); ` +
        `connectorId: ${connectorId}; ` +
        `model: ${model ?? 'unknown'}; ` +
        `prompt tokens: ${promptTokens ?? 'unknown'}; ` +
        `completion tokens: ${completionTokens ?? 'unknown'}; ` +
        `response length: ${contentLength} characters; ` +
        `traceId: ${traceId ?? 'unknown'}`
    );

    this.name = 'EmptyModelResponseError';
    this.completionTokens = completionTokens;
    this.connectorId = connectorId;
    this.contentLength = contentLength;
    this.model = model;
    this.promptTokens = promptTokens;
    this.responsePreview = getBoundedResponsePreview(responseBody);
    this.traceId = traceId;
  }
}

/** Returns true when `error` was raised for an empty model response, even if it was re-wrapped. */
export const isEmptyModelResponseError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  (error as { code?: unknown }).code === EMPTY_MODEL_RESPONSE_ERROR_CODE;
