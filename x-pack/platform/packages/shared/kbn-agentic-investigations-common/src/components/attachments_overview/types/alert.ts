/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getActiveAttachments,
  getLatestVersion,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENTS_OVERVIEW_LABELS } from '../translations';
import { buildAlertOrAttackParams, firstCreatedAt, minDate, maxDate } from './url_utils';

const TYPE_ALERT = 'security.alert';
const TYPE_ALERTS = 'security.alerts';

/** Pattern that distinguishes a security alert backing index from a plain event index. */
const SECURITY_ALERT_INDEX_PATTERN = '.alerts-security.alerts-';

/**
 * Parses the `data.alert` JSON string and returns the alert `_id`.
 * Skips plain events (non-security-alert indexes) and prose descriptions.
 */
const parseAlertId = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) return undefined;
  const record = data as Record<string, unknown>;
  const rawAlert = record.alert;
  if (typeof rawAlert !== 'string') return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawAlert);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;

  const doc = parsed as Record<string, unknown>;

  // _index can be a plain string (alerts-table path) or an array (flyout path via getRawData).
  const rawIndex = doc._index;
  const index = Array.isArray(rawIndex) ? (rawIndex[0] as string) : (rawIndex as string);
  if (typeof index !== 'string' || !index.includes(SECURITY_ALERT_INDEX_PATTERN)) return undefined;

  // _id can be a plain string (alerts-table path) or an array (flyout path).
  const rawId = doc._id;
  if (Array.isArray(rawId)) return typeof rawId[0] === 'string' ? rawId[0] : undefined;
  return typeof rawId === 'string' ? rawId : undefined;
};

/**
 * Extracts alert ids from `security.alert` and `security.alerts` attachments,
 * builds the Security alerts page URL, and returns the row label + href.
 * Returns `undefined` when no valid alert ids are found.
 */
export const getAlertRow = (
  attachments: readonly VersionedAttachment[],
  getSecurityAppUrl: (path: string) => string
): { label: string; href: string } | undefined => {
  const active = getActiveAttachments(attachments as VersionedAttachment[]);
  const alertIdSet = new Set<string>();
  let createdAt: string | undefined;
  let updatedAt: string | undefined;

  for (const attachment of active) {
    const { type } = attachment;
    const data = getLatestVersion(attachment)?.data as Record<string, unknown> | undefined;
    const ts = firstCreatedAt(attachment);

    if (type === TYPE_ALERT) {
      const id = parseAlertId(data);
      if (id && !alertIdSet.has(id)) {
        alertIdSet.add(id);
        createdAt = minDate(createdAt, ts);
        updatedAt = maxDate(updatedAt, ts);
      }
    } else if (type === TYPE_ALERTS) {
      const ids = data?.alertIds;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string' && !alertIdSet.has(id)) {
            alertIdSet.add(id);
            createdAt = minDate(createdAt, ts);
            updatedAt = maxDate(updatedAt, ts);
          }
        }
      }
    }
  }

  if (alertIdSet.size === 0 || !createdAt || !updatedAt) return undefined;

  const ids = [...alertIdSet];
  const params = buildAlertOrAttackParams(ids, createdAt, updatedAt);
  return {
    label: ATTACHMENTS_OVERVIEW_LABELS.alerts(ids.length),
    href: getSecurityAppUrl(`/alerts?${params.toString()}`),
  };
};
