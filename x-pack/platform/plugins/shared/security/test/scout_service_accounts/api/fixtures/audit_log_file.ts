/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

import { AUDIT_LOG_PATH } from '@kbn/scout';

/** One record of the JSON audit log, as Kibana writes it. */
export interface AuditLogRecord {
  '@timestamp'?: string;
  message?: string;
  event?: { action?: string; category?: string[]; type?: string[]; outcome?: string };
  user?: {
    id?: string;
    name?: string;
    roles?: string[];
    target?: { id?: string; name?: string };
  };
  kibana?: {
    space_id?: string;
    workload?: { plugin_id?: string; type?: string; id?: string };
    saved_object?: { type?: string; id?: string };
  };
  trace?: { id?: string };
  url?: { path?: string };
}

const readAuditLog = (): AuditLogRecord[] => {
  try {
    return readFileSync(AUDIT_LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditLogRecord);
  } catch {
    // Not written yet.
    return [];
  }
};

/**
 * Polls the audit log until a record written at or after `since` matches `filter`, and resolves
 * with the latest such record.
 */
export const waitForAuditEvent = async (
  filter: (record: AuditLogRecord) => boolean,
  { since, timeoutMs = 10_000 }: { since: number; timeoutMs?: number }
): Promise<AuditLogRecord> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = readAuditLog()
      .reverse()
      .find((record) => new Date(record['@timestamp'] ?? 0).getTime() >= since && filter(record));
    if (match) return match;
    await setTimeout(300);
  }
  throw new Error(`Timed out waiting for a matching audit event in ${AUDIT_LOG_PATH}`);
};
