/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';

import type { AppenderConfigType, ServiceStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';

import type { AuditLogWriteAccess } from './audit_write_access';
import { getAuditLogPath, getAuditStatus$, probeAuditLogWriteAccess } from './audit_write_access';

describe('getAuditLogPath', () => {
  it('returns the fileName of a rolling-file appender', () => {
    expect(
      getAuditLogPath({
        type: 'rolling-file',
        fileName: '/var/log/audit.log',
      } as AppenderConfigType)
    ).toEqual('/var/log/audit.log');
  });

  it('returns the fileName of a file appender', () => {
    expect(
      getAuditLogPath({ type: 'file', fileName: '/var/log/audit.log' } as AppenderConfigType)
    ).toEqual('/var/log/audit.log');
  });

  it.each(['console', 'otel', 'rewrite'])(
    'returns undefined for a %s appender, which cannot be broken by a read-only mount',
    (type) => {
      expect(getAuditLogPath({ type } as AppenderConfigType)).toBeUndefined();
    }
  );

  it('returns undefined when no appender is configured', () => {
    expect(getAuditLogPath(undefined)).toBeUndefined();
  });
});

// `root` bypasses permission bits, so a chmod-ed directory would still be writable.
const describeUnlessRoot = process.getuid?.() === 0 ? describe.skip : describe;

describeUnlessRoot('probeAuditLogWriteAccess', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kbn-audit-probe-'));
  });

  afterEach(() => {
    // Restore write permissions so the tree can be removed.
    for (const dir of [join(testDir, 'logs'), testDir]) {
      if (existsSync(dir)) {
        chmodSync(dir, 0o755);
      }
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('when the directory is writable', () => {
    it('reports writable', () => {
      const result = probeAuditLogWriteAccess(join(testDir, 'audit.log'));

      expect(result).toEqual({
        writable: true,
        path: join(testDir, 'audit.log'),
        checkedAt: expect.any(String),
      });
    });

    it('creates the parent directory, as the appender would', () => {
      const logPath = join(testDir, 'nested', 'deeper', 'audit.log');

      expect(probeAuditLogWriteAccess(logPath).writable).toBe(true);
      expect(existsSync(join(testDir, 'nested', 'deeper'))).toBe(true);
    });

    it('does not truncate an existing log file', () => {
      // The probe opens in append mode, so an existing audit trail must survive being checked.
      const logPath = join(testDir, 'audit.log');
      writeFileSync(logPath, 'existing audit record\n');

      probeAuditLogWriteAccess(logPath);

      expect(readFileSync(logPath, 'utf8')).toEqual('existing audit record\n');
    });
  });

  describe('when the directory is read-only', () => {
    let readOnlyDir: string;

    beforeEach(() => {
      readOnlyDir = join(testDir, 'logs');
      mkdirSync(readOnlyDir);
      // r-xr-xr-x: the directory exists but no file can be created in it, which is what a
      // read-only mount looks like.
      chmodSync(readOnlyDir, 0o555);
    });

    it('reports not writable with the error code', () => {
      const logPath = join(readOnlyDir, 'audit.log');

      const result = probeAuditLogWriteAccess(logPath);

      expect(result).toEqual({
        writable: false,
        path: logPath,
        code: 'EACCES',
        reason: expect.stringContaining('permission denied'),
        checkedAt: expect.any(String),
      });
    });

    it('does not throw', () => {
      expect(() => probeAuditLogWriteAccess(join(readOnlyDir, 'audit.log'))).not.toThrow();
    });

    it('reports not writable when the parent directory cannot be created either', () => {
      const result = probeAuditLogWriteAccess(join(readOnlyDir, 'nested', 'audit.log'));

      expect(result.writable).toBe(false);
      expect(result.code).toEqual('EACCES');
    });

    it('reports writable again once permissions are restored', () => {
      const logPath = join(readOnlyDir, 'audit.log');
      expect(probeAuditLogWriteAccess(logPath).writable).toBe(false);

      chmodSync(readOnlyDir, 0o755);

      expect(probeAuditLogWriteAccess(logPath).writable).toBe(true);
    });
  });

  describe('when the failure is not a read-only filesystem error', () => {
    it('reports writable so the failure surfaces as it always has', () => {
      // A directory where a file is expected: opening it throws EISDIR, which this probe is not
      // designed to handle and must not silently disable audit logging for.
      const asDirectory = join(testDir, 'audit.log');
      mkdirSync(asDirectory);

      const result = probeAuditLogWriteAccess(asDirectory);

      expect(result.writable).toBe(true);
      expect(result.code).toBeUndefined();
    });
  });
});

const AUDIT_LOG_PATH = '/usr/share/kibana/logs/audit.log';

const available: ServiceStatus = {
  level: ServiceStatusLevels.available,
  summary: 'All dependencies are available',
};

const writable: AuditLogWriteAccess = {
  writable: true,
  path: AUDIT_LOG_PATH,
  checkedAt: '2026-08-03T10:00:00.000Z',
};

const notWritable: AuditLogWriteAccess = {
  writable: false,
  path: AUDIT_LOG_PATH,
  code: 'EROFS',
  reason: `EROFS: read-only file system, open '${AUDIT_LOG_PATH}'`,
  checkedAt: '2026-08-03T10:00:00.000Z',
};

const getStatus = (
  writeAccess: AuditLogWriteAccess | undefined,
  derivedStatus: ServiceStatus = available
) =>
  firstValueFrom(
    getAuditStatus$({
      writeAccess$: writeAccess ? of(writeAccess) : undefined,
      derivedStatus$: of(derivedStatus),
    })
  );

describe('getAuditStatus$', () => {
  describe('when the audit log is writable', () => {
    it('passes the derived status through', async () => {
      await expect(getStatus(writable)).resolves.toEqual(available);
    });
  });

  describe('when the audit log cannot be written', () => {
    it('reports degraded rather than letting the lost audit trail go unnoticed', async () => {
      const status = await getStatus(notWritable);

      expect(status.level).toEqual(ServiceStatusLevels.degraded);
      expect(status.summary).toEqual('Audit log cannot be written');
    });

    it('names the file, the error and the check time in the detail', async () => {
      const status = await getStatus(notWritable);

      expect(status.detail).toContain('EROFS');
      expect(status.detail).toContain(AUDIT_LOG_PATH);
      expect(status.detail).toContain('2026-08-03T10:00:00.000Z');
    });

    it('says audit events are being discarded, not merely delayed', async () => {
      const status = await getStatus(notWritable);

      expect(status.detail).toContain('audit events are being discarded');
    });

    it('carries the raw write access in meta', async () => {
      const status = await getStatus(notWritable);

      expect(status.meta).toEqual({ auditLogWriteAccess: notWritable });
    });

    it('does not mask a more severe derived status', async () => {
      const unavailable: ServiceStatus = {
        level: ServiceStatusLevels.unavailable,
        summary: 'Elasticsearch is unavailable',
      };

      await expect(getStatus(notWritable, unavailable)).resolves.toEqual(unavailable);
    });

    it('recovers to the derived status once the filesystem becomes writable', async () => {
      const writeAccess$ = new BehaviorSubject<AuditLogWriteAccess>(notWritable);
      const status$ = getAuditStatus$({ writeAccess$, derivedStatus$: of(available) });

      const seen: ServiceStatus[] = [];
      const subscription = status$.subscribe((status) => seen.push(status));

      writeAccess$.next(writable);
      subscription.unsubscribe();

      expect(seen.map(({ level }) => level)).toEqual([
        ServiceStatusLevels.degraded,
        ServiceStatusLevels.available,
      ]);
    });
  });

  describe('when there is nothing to probe', () => {
    it('passes the derived status through', async () => {
      // No write access observable: the appender is console/otel, or audit is disabled.
      await expect(getStatus(undefined)).resolves.toEqual(available);
    });
  });
});
