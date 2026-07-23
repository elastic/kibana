/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '../common/types';

/**
 * Visibility window per severity tier, in days. The query excludes docs older
 * than their tier's TTL and the retention cleanup task deletes them; the
 * longest TTL must stay within the data stream's 180d retention ceiling.
 */
export const SEVERITY_TTL_DAYS: Record<Severity, number> = {
  info: 30,
  warning: 60,
  error: 180,
  critical: 180,
};
