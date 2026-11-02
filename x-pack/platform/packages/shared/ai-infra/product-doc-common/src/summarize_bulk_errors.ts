/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal structural types for Elasticsearch bulk item failures.
 * Kept free of `@elastic/elasticsearch` imports so this shared package stays lightweight.
 *
 * Input typing is intentionally loose (`unknown` operation bags) so official
 * `BulkResponse` values from `@elastic/elasticsearch` assign without casts.
 */
interface BulkErrorCause {
  type?: string;
  reason?: string;
}

interface BulkOperationError {
  type?: string;
  reason?: string;
  caused_by?: BulkErrorCause;
}

interface BulkOperationResult {
  status?: number;
  _index?: string;
  _id?: string | null;
  error?: BulkOperationError;
}

interface BulkResponseItem {
  index?: BulkOperationResult;
  create?: BulkOperationResult;
  update?: BulkOperationResult;
  delete?: BulkOperationResult;
}

interface SummarizableBulkResponse {
  /** Accepts official ES `BulkResponse.items` without requiring ES client types here. */
  items: readonly unknown[];
}

const FIELD_VALUE_PREVIEW_MARKER = `Preview of field's value:`;
const MAX_REASON_LENGTH = 500;

/**
 * Strips Elasticsearch field-value previews (and length-limits) from bulk error
 * reasons so document contents are not echoed into CI logs.
 *
 * Mirrors the redaction in alerting's `sanitizeBulkErrorResponse`.
 */
const sanitizeReason = (reason?: string): string | undefined => {
  if (reason == null) {
    return undefined;
  }

  let sanitized = reason;
  const redactIndex = sanitized.indexOf(FIELD_VALUE_PREVIEW_MARKER);
  if (redactIndex > 1) {
    sanitized = sanitized.substring(0, redactIndex - 1);
  }

  if (sanitized.length > MAX_REASON_LENGTH) {
    sanitized = `${sanitized.slice(0, MAX_REASON_LENGTH)}…`;
  }

  return sanitized;
};

const asBulkResponseItem = (value: unknown): BulkResponseItem | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as BulkResponseItem;
};

const asOperationResult = (value: unknown): BulkOperationResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as BulkOperationResult;
};

/**
 * Summarizes bulk item failures without dumping the full response (which can be
 * large/noisy and may include request payloads / embeddings).
 *
 * Generic ES bulk helper hosted in `@kbn/product-doc-common` for reuse by the
 * KB artifact builders (product-doc and Security Labs).
 */
export const summarizeBulkErrors = (response: SummarizableBulkResponse): string => {
  const failures = response.items
    .map((rawItem) => {
      const item = asBulkResponseItem(rawItem);
      if (!item) {
        return undefined;
      }
      const operation =
        asOperationResult(item.index) ??
        asOperationResult(item.create) ??
        asOperationResult(item.update) ??
        asOperationResult(item.delete);
      if (!operation?.error) {
        return undefined;
      }

      const error: {
        type?: string;
        reason?: string;
        caused_by?: { type?: string; reason?: string };
      } = {
        type: operation.error.type,
        reason: sanitizeReason(operation.error.reason),
      };

      if (operation.error.caused_by) {
        error.caused_by = {
          type: operation.error.caused_by.type,
          reason: sanitizeReason(operation.error.caused_by.reason),
        };
      }

      return {
        status: operation.status,
        _index: operation._index,
        _id: operation._id,
        error,
      };
    })
    .filter((failure): failure is NonNullable<typeof failure> => failure != null);

  return JSON.stringify({ failureCount: failures.length, failures });
};
