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

const READ_ONLY_FILESYSTEM_ERROR_CODES = new Set(['EROFS', 'EACCES', 'EPERM']);

export interface AuditLogWriteAccess {
  writable: boolean;
  path: string;
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
    appendFileSync(path, '');
    return { writable: true, path, checkedAt };
  } catch (error) {
    if (!READ_ONLY_FILESYSTEM_ERROR_CODES.has(error.code)) {
      return { writable: true, path, checkedAt };
    }

    return {
      writable: false,
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
  writeAccess$: Observable<AuditLogWriteAccess> | undefined;
  derivedStatus$: Observable<ServiceStatus>;
}): Observable<ServiceStatus> => {
  if (!writeAccess$) {
    return derivedStatus$;
  }

  return combineLatest([derivedStatus$, writeAccess$]).pipe(
    map(([derived, writeAccess]) => {
      if (writeAccess.writable || derived.level > ServiceStatusLevels.degraded) {
        return derived;
      }

      return {
        level: ServiceStatusLevels.degraded,
        summary: 'Audit log cannot be written',
        detail:
          `${writeAccess.code ?? 'Error'} writing to ${writeAccess.path} as of ` +
          `${writeAccess.checkedAt}. Audit logging is turned off and audit events are being ` +
          `discarded. Kibana is otherwise operational.`,
        meta: { auditLogWriteAccess: writeAccess },
      };
    })
  );
};
