/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import { AUDIT_LOG_PATH } from '@kbn/scout';

/**
 * Reads the audit log once and returns the most recent event matching the filter,
 * or `undefined` when no event matches (or the log file has not been created yet).
 * Useful both as the polling primitive for {@link waitForAuditEvent} and for
 * asserting the ABSENCE of an event.
 */
export const scanAuditLog = (
  filter: (event: Record<string, unknown>) => boolean
): Record<string, unknown> | undefined => {
  let events: Array<Record<string, unknown>>;
  try {
    events = readFileSync(AUDIT_LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return undefined; // audit log file not created yet
  }
  return events.reverse().find(filter);
};

/** Polls the audit log until an event matching the filter appears. */
export const waitForAuditEvent = async (
  filter: (event: Record<string, unknown>) => boolean,
  {
    timeoutMs = 15_000,
    description = 'matching audit event',
  }: { timeoutMs?: number; description?: string } = {}
): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = scanAuditLog(filter);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${description} in ${AUDIT_LOG_PATH}`);
};
