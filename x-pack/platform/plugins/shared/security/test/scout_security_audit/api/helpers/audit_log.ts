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

export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

export interface SavedObjectDiff {
  format: string;
  ops: JsonPatchOp[];
  noOps: Array<{ path: string }>;
}

interface SavedObjectAuditEvent {
  event?: { action?: string; outcome?: string };
  kibana?: { saved_object?: { id?: string; type?: string }; diff?: SavedObjectDiff };
}

/** Matches a mutation's result event for `id`: the only event for the operation, carrying `kibana.diff`. */
export const isDiffEvent =
  (action: string, id: string) =>
  (event: Record<string, unknown>): boolean => {
    const ev = event as SavedObjectAuditEvent;
    return (
      ev.event?.action === action && ev.kibana?.saved_object?.id === id && ev.kibana?.diff != null
    );
  };

/** Reads the audit log once and returns the mutation's diff, or `undefined` (to assert its absence). */
export const scanForDiff = (action: string, id: string): SavedObjectDiff | undefined =>
  (scanAuditLog(isDiffEvent(action, id)) as SavedObjectAuditEvent | undefined)?.kibana?.diff;

/** Polls the audit log until the diff-bearing event for a mutation appears. */
export const waitForDiffEvent = async (action: string, id: string): Promise<SavedObjectDiff> => {
  const event = (await waitForAuditEvent(isDiffEvent(action, id), {
    description: `${action} diff event for ${id}`,
  })) as SavedObjectAuditEvent;
  const diff = event.kibana?.diff;
  if (!diff) {
    throw new Error(`Audit event for ${action} ${id} unexpectedly carries no kibana.diff`);
  }
  return diff;
};
