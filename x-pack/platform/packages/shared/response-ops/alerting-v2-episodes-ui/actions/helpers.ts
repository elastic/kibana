/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertActionNoOpCode, type BulkResponse } from '@kbn/alerting-v2-schemas';
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
  const unchanged = errors.filter(({ error }) => isAlertActionNoOpCode(error.code)).length;
  return { processed, failed: errors.length - unchanged, unchanged };
};

/**
 * Builds the toast for a bulk alert-action response: success when every alert
 * the server could change was changed, a partial-success warning otherwise.
 * Unchanged alerts count towards neither, so a request that asked for nothing
 * new reports exactly that rather than a failure.
 */
export const successOrPartialToast = (
  response: BulkResponse
): { title: string; color: 'success' | 'warning' } => {
  const { processed, failed, unchanged } = readBulkOutcome(response);

  if (failed > 0) {
    return {
      title: i18n.getBulkPartialSuccessToast(processed, processed + failed),
      color: 'warning',
    };
  }

  return processed === 0 && unchanged > 0
    ? { title: i18n.BULK_NO_CHANGES_TOAST, color: 'success' }
    : { title: i18n.getBulkSuccessToast(processed), color: 'success' };
};
