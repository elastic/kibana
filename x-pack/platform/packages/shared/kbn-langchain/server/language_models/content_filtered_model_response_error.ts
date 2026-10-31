/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBoundedResponsePreview } from './empty_model_response_error';

/**
 * Stable code that lets a caller classify a provider content-filter stop without importing the
 * error class (errors are frequently re-wrapped on their way through LangChain).
 */
export const CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE = 'CONTENT_FILTERED_MODEL_RESPONSE';

/** The `finish_reason` OpenAI-compatible providers report when their safety filter stops a completion. */
export const CONTENT_FILTER_FINISH_REASON = 'content_filter';

/**
 * Leading phrase of every `ContentFilteredModelResponseError` message. Exported so consumers that
 * can only inspect a persisted message string can match on the phrase the error is built from.
 */
export const CONTENT_FILTERED_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX =
  "the model provider's content filter stopped the response";

export interface ContentFilteredModelResponseErrorParams {
  /** Completion token count reported by the model, when the connector reports one. */
  completionTokens?: number;
  connectorId: string;
  /** Length of the (partial) content that was returned before the provider stopped the response. */
  contentLength: number;
  /** Model name the connector resolved to, when known. */
  model?: string;
  /** Prompt token count reported by the model, when the connector reports one. */
  promptTokens?: number;
  /** The (partial, possibly empty) response body that was returned. */
  responseBody: string;
  traceId?: string;
}

/**
 * Raised when a provider ends a completion with `finish_reason: content_filter`.
 *
 * The same prompt is filtered again on every retry, so callers must treat this as non-retryable.
 * Unlike an empty completion this fires whether the partial content is empty or truncated, because
 * truncated output would otherwise fail later as an unrelated parse error and be retried.
 */
export class ContentFilteredModelResponseError extends Error {
  public readonly code = CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE;
  public readonly completionTokens?: number;
  public readonly connectorId: string;
  public readonly contentLength: number;
  public readonly finishReason = CONTENT_FILTER_FINISH_REASON;
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
  }: ContentFilteredModelResponseErrorParams) {
    super(
      `${CONTENT_FILTERED_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX} (code: ${CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE}); ` +
        `finish_reason: ${CONTENT_FILTER_FINISH_REASON}; ` +
        `connectorId: ${connectorId}; ` +
        `model: ${model ?? 'unknown'}; ` +
        `prompt tokens: ${promptTokens ?? 'unknown'}; ` +
        `completion tokens: ${completionTokens ?? 'unknown'}; ` +
        `partial response length: ${contentLength} characters; ` +
        `traceId: ${traceId ?? 'unknown'}; ` +
        `partial response: "${getBoundedResponsePreview(responseBody)}"`
    );

    this.name = 'ContentFilteredModelResponseError';
    this.completionTokens = completionTokens;
    this.connectorId = connectorId;
    this.contentLength = contentLength;
    this.model = model;
    this.promptTokens = promptTokens;
    this.traceId = traceId;
  }
}

/** Returns true when `error` was raised for a content-filtered response, even if it was re-wrapped. */
export const isContentFilteredModelResponseError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  (error as { code?: unknown }).code === CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE;

/** Returns true when a provider-reported finish reason is the content-filter stop. */
export const isContentFilterFinishReason = (finishReason: unknown): boolean =>
  finishReason === CONTENT_FILTER_FINISH_REASON;
