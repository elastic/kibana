/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum number of response characters included in a message or error preview. */
export const MAX_RESPONSE_PREVIEW_LENGTH = 500;

/**
 * Stable code that lets a caller classify an empty completion without importing the error class
 * (errors are frequently re-wrapped on their way through LangChain).
 */
export const EMPTY_MODEL_RESPONSE_ERROR_CODE = 'EMPTY_MODEL_RESPONSE';

/**
 * Returns a bounded, single-line-safe preview of a model response. The full body can be megabytes
 * and, on serverless, there is no log-level switch that would let support recover it later, so the
 * preview is what gets persisted alongside the error.
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
  /** The (bounded) response body that was returned. */
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
 * persisted error alone.
 */
export class EmptyModelResponseError extends Error {
  public readonly code = EMPTY_MODEL_RESPONSE_ERROR_CODE;
  public readonly completionTokens?: number;
  public readonly connectorId: string;
  public readonly contentLength: number;
  public readonly model?: string;
  public readonly promptTokens?: number;
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
      `the model returned an empty response (code: ${EMPTY_MODEL_RESPONSE_ERROR_CODE}); ` +
        `connectorId: ${connectorId}; ` +
        `model: ${model ?? 'unknown'}; ` +
        `prompt tokens: ${promptTokens ?? 'unknown'}; ` +
        `completion tokens: ${completionTokens ?? 'unknown'}; ` +
        `response length: ${contentLength} characters; ` +
        `traceId: ${traceId ?? 'unknown'}; ` +
        `response: "${getBoundedResponsePreview(responseBody)}"`
    );

    this.name = 'EmptyModelResponseError';
    this.completionTokens = completionTokens;
    this.connectorId = connectorId;
    this.contentLength = contentLength;
    this.model = model;
    this.promptTokens = promptTokens;
    this.traceId = traceId;
  }
}

/** Returns true when `error` was raised for an empty model response, even if it was re-wrapped. */
export const isEmptyModelResponseError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  (error as { code?: unknown }).code === EMPTY_MODEL_RESPONSE_ERROR_CODE;
