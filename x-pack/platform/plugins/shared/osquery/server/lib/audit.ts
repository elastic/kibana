/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent, AuditLogger } from '@kbn/core-security-server';
import type { EcsEvent } from '@elastic/ecs';

export enum OsqueryAuditAction {
  /** A live query was dispatched (e.g. browsing a directory in the Files tab). */
  LIVE_QUERY = 'osquery_live_query',
  /** A directory was browsed in the Files tab file-system viewer. */
  FILE_BROWSE = 'osquery_file_browse',
  /** A file was retrieved/acted-on from the Files tab (get-file / runscript). */
  FILE_RETRIEVE = 'osquery_file_retrieve',
}

interface OsqueryAuditEventParams {
  action: OsqueryAuditAction;
  /** Human-readable message; a default is derived from the action when omitted. */
  message?: string;
  /** Target host's Fleet agent id (or comma-joined ids for multi-agent queries). */
  agentId?: string;
  /** User-navigated path being browsed or acted on. */
  path?: string;
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

const DEFAULT_MESSAGES: Record<OsqueryAuditAction, string> = {
  [OsqueryAuditAction.LIVE_QUERY]: 'User dispatched an Osquery live query',
  [OsqueryAuditAction.FILE_BROWSE]: 'User browsed a directory via the Osquery Files tab',
  [OsqueryAuditAction.FILE_RETRIEVE]: 'User retrieved a file via the Osquery Files tab',
};

/**
 * Builds an ECS-shaped audit event for the Osquery live-query / Files-tab paths.
 *
 * The browse path emits no audit record today; for a security feature, every
 * directory browse and every file retrieval must produce a who/host/path/when
 * record. The acting user is attached by the audit service from the request, so
 * callers only supply host (agent id), path, action, and outcome.
 */
export const createOsqueryAuditEvent = ({
  action,
  message,
  agentId,
  path,
  outcome = 'unknown',
  error,
}: OsqueryAuditEventParams): AuditEvent => {
  const labels: Record<string, string> = {};
  if (agentId) {
    labels.agent_id = agentId;
  }

  if (path != null) {
    labels.path = path;
  }

  return {
    message: message ?? DEFAULT_MESSAGES[action],
    event: {
      action,
      category: ['database'],
      type: ['access'],
      outcome: error ? 'failure' : outcome,
    },
    ...(Object.keys(labels).length ? { labels } : {}),
    ...(error ? { error: { code: error.name, message: error.message } } : {}),
  };
};

/**
 * Convenience emitter: builds and logs an Osquery audit event in one call.
 * No-op when no audit logger is available (e.g. security disabled).
 */
export const logOsqueryAuditEvent = (
  auditLogger: AuditLogger | undefined,
  params: OsqueryAuditEventParams
): void => {
  auditLogger?.log(createOsqueryAuditEvent(params));
};
