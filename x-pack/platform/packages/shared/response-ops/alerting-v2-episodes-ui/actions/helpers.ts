/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertActionNoOpCode, type BulkResponse } from '@kbn/alerting-v2-schemas';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import * as i18n from './translations';

/**
 * Keeps one item per series. `group_hash` is rule-local, so episodes of two rules on the same
 * host share it but are different series. Items without a `series_id` have no identity to act
 * on and are dropped.
 */
export const uniqueBySeries = <T extends { series_id?: string | null }>(
  items: T[]
): Array<T & { series_id: string }> => {
  const seen = new Set<string>();
  return items.filter((item): item is T & { series_id: string } => {
    if (!item.series_id || seen.has(item.series_id)) {
      return false;
    }
    seen.add(item.series_id);
    return true;
  });
};

export interface BulkOutcome {
  /** Alerts the server changed. */
  processed: number;
  /** Alerts the server could not change. */
  failed: number;
  /** Alerts that already satisfied the request, so the server left them alone. */
  unchanged: number;
  /** Per-alert failures that should be shown to the user. */
  errors: BulkResponse['errors'];
}

/**
 * Reads a bulk alert-action response as an outcome per alert. The server
 * reports an alert that already carried the requested value as a per-item
 * error, which is accurate on the wire but is not a failure to show a user:
 * their intent is already satisfied and nothing broke.
 */
export const readBulkOutcome = ({
  affected_count: processed,
  errors,
}: BulkResponse): BulkOutcome => {
  const failures = errors.filter(({ error }) => !isAlertActionNoOpCode(error.code));
  const unchanged = errors.length - failures.length;
  return { processed, failed: failures.length, unchanged, errors: failures };
};

export interface BulkActionErrorDetail {
  id?: string;
  message: string;
}

export const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return error == null ? i18n.UNKNOWN_ERROR : String(error);
  }

  const httpError = error as IHttpFetchError<{ message?: string }>;
  return httpError.body?.message ?? error.message;
};

/** Builds the error consumed by Core's expandable error toast. */
export const createBulkActionError = (errors: BulkActionErrorDetail[], failed: number): Error =>
  Object.assign(new Error(i18n.getBulkErrorDetailsHeading(failed)), {
    stack: errors.map(({ id, message }) => (id ? `${id} — ${message}` : message)).join('\n'),
  });
