/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertActionNoOpCode, type BulkResponse } from '@kbn/alerting-v2-schemas';
import * as i18n from './translations';

export const uniqueByGroup = <T extends { group_hash: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.group_hash) ? false : (seen.add(x.group_hash), true)));
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
