/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `@kbn/fs` is not usable here: its helpers resolve names against the Kibana data directory via
// `getSafePath`, whereas the audit log lives outside it at an operator-configured absolute path.
/* eslint-disable-next-line @kbn/eslint/require_kbn_fs */
import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';

import type { AppenderConfigType, ServiceStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';

export interface AuditLogWriteAccess {
  granted: boolean;
  path: string;
  /** The `NodeJS.ErrnoException` code when access was denied, e.g. `EROFS`, `EACCES`, `ENOSPC`. */
  code?: string;
  reason?: string;
  checkedAt: string;
}

export const getAuditLogPath = (appender: AppenderConfigType | undefined): string | undefined =>
  appender && (appender.type === 'file' || appender.type === 'rolling-file')
    ? appender.fileName
    : undefined;

export const probeAuditLogWriteAccess = (path: string): AuditLogWriteAccess => {
  const checkedAt = new Date().toISOString();

  try {
    mkdirSync(dirname(path), { recursive: true });
    // Append empty string: probes write access without truncating any existing log content.
    appendFileSync(path, '');

    return { granted: true, path, checkedAt };
  } catch (error) {
    return {
      granted: false,
      path,
      code: error.code,
      reason: error.message,
      checkedAt,
    };
  }
};

export const getAuditStatus$ = ({
  writeAccess$,
  derivedStatus$,
}: {
  /** Absent when the audit appender does not write to the filesystem, or audit is disabled. */
  writeAccess$: Observable<AuditLogWriteAccess | undefined> | undefined;
  derivedStatus$: Observable<ServiceStatus>;
}): Observable<ServiceStatus> => {
  if (!writeAccess$) {
    return derivedStatus$;
  }

  return combineLatest([derivedStatus$, writeAccess$]).pipe(
    map(([derived, writeAccess]) => {
      if (!writeAccess || writeAccess.granted || derived.level > ServiceStatusLevels.degraded) {
        return derived;
      }

      return {
        level: ServiceStatusLevels.degraded,
        summary: 'Audit log cannot be written',
        detail: `${writeAccess.code ?? 'Error'} writing to ${writeAccess.path}${
          writeAccess.reason ? `: ${writeAccess.reason}` : ''
        }. Checked at ${
          writeAccess.checkedAt
        }. Audit logging is paused and audit events are being discarded. Restart Kibana after resolving the issue to resume audit logging.`,
        meta: { auditLogWriteAccess: writeAccess },
      };
    })
  );
};
