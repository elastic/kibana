/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MODEL_REFUSAL_ERROR_CODE = 'MODEL_REFUSAL' as const;

/** Every {@link ModelRefusalError} message starts with this text, so callers can match it after serialization. */
export const MODEL_REFUSAL_ERROR_MESSAGE_PREFIX = 'The model refused to complete the response';

/**
 * The refusal the inference plugin sets when a provider ends a response with
 * `finish_reason: content_filter` and sends no refusal text of its own. It mirrors
 * `CONTENT_FILTER_REFUSAL` in the inference plugin
 * (`inference/server/chat_complete/utils/content_filter_refusal.ts`), which this package can't
 * import.
 */
export const PROVIDER_CONTENT_FILTER_REFUSAL =
  'The response was stopped by the provider content filter (finish_reason: content_filter).';

/**
 * Returns the refusal text for a {@link ModelRefusalError} message. The message is persisted and
 * sent to telemetry, so only Kibana's own content-filter text is included; a provider's own refusal
 * text (model output) is replaced by its length, and stays on `ModelRefusalError.refusal`.
 */
export const getRefusalSummary = (refusal: string): string =>
  refusal === PROVIDER_CONTENT_FILTER_REFUSAL
    ? refusal
    : `the provider returned its own refusal text (${refusal.length} characters, not included)`;

interface ModelRefusalErrorParams {
  connectorId: string;
  model?: string;
  partialContentLength: number;
  refusal: string;
}

/**
 * Thrown when a model declines a request, for example when the provider ends the response with
 * `finish_reason: content_filter`. Re-sending the same prompt is likely to get the same refusal, so
 * callers should not retry it.
 */
export class ModelRefusalError extends Error {
  readonly code = MODEL_REFUSAL_ERROR_CODE;
  readonly connectorId: string;
  readonly model?: string;
  /** Characters of content the model wrote before it stopped; that content is incomplete. */
  readonly partialContentLength: number;
  readonly refusal: string;

  constructor({ connectorId, model, partialContentLength, refusal }: ModelRefusalErrorParams) {
    super(`${MODEL_REFUSAL_ERROR_MESSAGE_PREFIX}: ${getRefusalSummary(refusal)}`);
    this.name = 'ModelRefusalError';
    this.connectorId = connectorId;
    this.model = model;
    this.partialContentLength = partialContentLength;
    this.refusal = refusal;
  }
}

/** Returns true when `error` is a {@link ModelRefusalError}. */
export const isModelRefusalError = (error: unknown): error is ModelRefusalError =>
  error instanceof ModelRefusalError ||
  (error instanceof Error &&
    (error as Error & { code?: unknown }).code === MODEL_REFUSAL_ERROR_CODE);

/**
 * Throws a {@link ModelRefusalError} when a completion carries a refusal, whether or not the model
 * wrote some content before it stopped.
 */
export const throwIfModelRefusal = ({
  connectorId,
  content,
  model,
  refusal,
}: {
  connectorId: string;
  content: string | null | undefined;
  model?: string;
  refusal: string | null | undefined;
}): void => {
  if (refusal == null || refusal.trim() === '') {
    return;
  }

  throw new ModelRefusalError({
    connectorId,
    model,
    partialContentLength: content?.length ?? 0,
    refusal,
  });
};
