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

/**
 * Reads the body a ServiceNow business rule (or Flow Designer REST step) sends for an
 * incident or security incident: `{ "sys_id": "...", "sys_updated_on": "..." }`. The push
 * records the `sys_id`, not the incident number.
 */
export const parseNotification: ParseNotification = (body) => {
  if (!isRecord(body)) {
    return null;
  }

  const externalId = asBoundedString(body.sys_id, MAX_NOTIFICATION_EXTERNAL_ID_LENGTH);
  if (externalId == null) {
    return null;
  }

  const updatedAt = asBoundedString(body.sys_updated_on, MAX_NOTIFICATION_TIMESTAMP_LENGTH);

  return { externalId, ...(updatedAt != null ? { updatedAt } : {}) };
};
