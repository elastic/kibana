/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParseNotification } from '../types';
import {
  asBoundedString,
  isRecord,
  MAX_NOTIFICATION_EXTERNAL_ID_LENGTH,
  MAX_NOTIFICATION_TIMESTAMP_LENGTH,
} from '../utils';

const toTimestamp = (value: unknown): string | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/**
 * Reads a Jira webhook or Automation "Send web request" body. Both carry the issue under
 * `issue`; the push records the numeric `issue.id`, not the key.
 */
export const parseNotification: ParseNotification = (body) => {
  if (!isRecord(body) || !isRecord(body.issue)) {
    return null;
  }

  const { issue } = body;
  const rawId = typeof issue.id === 'number' ? String(issue.id) : issue.id;
  const externalId = asBoundedString(rawId, MAX_NOTIFICATION_EXTERNAL_ID_LENGTH);
  if (externalId == null) {
    return null;
  }

  const fields = isRecord(issue.fields) ? issue.fields : undefined;
  const updatedAt =
    asBoundedString(fields?.updated, MAX_NOTIFICATION_TIMESTAMP_LENGTH) ??
    toTimestamp(body.timestamp);

  return { externalId, ...(updatedAt != null ? { updatedAt } : {}) };
};
