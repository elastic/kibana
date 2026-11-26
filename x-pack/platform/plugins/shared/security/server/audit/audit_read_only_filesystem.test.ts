/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import type { LoggerContextConfigInput, ServiceStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import {
  coreMock,
  httpServiceMock,
  loggingSystemMock,
  statusServiceMock,
} from '@kbn/core/server/mocks';

import { AuditService, createLoggingConfig } from './audit_service';
import type { SecurityLicenseFeatures } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';

const allowAuditLogging = { allowAuditLogging: true } as SecurityLicenseFeatures;

const auditConfig = (appender: ConfigType['audit']['appender']): ConfigType['audit'] =>
  ({ enabled: true, include_saved_object_names: false, appender } as ConfigType['audit']);

const rollingFileAppender = (fileName: string) =>
  ({
    type: 'rolling-file',
    fileName,
    layout: { type: 'json' },
    policy: { type: 'time-interval' },
    strategy: { type: 'numeric', max: 10 },
  } as ConfigType['audit']['appender']);

describe('createLoggingConfig', () => {
  const config = auditConfig(rollingFileAppender('/var/log/kibana/audit.log'));

  it('keeps the configured appender and `info` level while the log is writable', () => {
    const loggingConfig = createLoggingConfig(config, {
      granted: true,
      path: '/var/log/kibana/audit.log',
      checkedAt: '2026-08-03T10:00:00.000Z',
    })(allowAuditLogging);

    expect((loggingConfig.appenders as any).auditTrailAppender.type).toEqual('rolling-file');
    expect(loggingConfig.loggers![0].level).toEqual('info');
  });

  describe('when the audit log cannot be written', () => {
    const loggingConfig = (): LoggerContextConfigInput =>
      createLoggingConfig(config, {
        granted: false,
        path: '/var/log/kibana/audit.log',
        code: 'EROFS',
        reason: 'EROFS: read-only file system',
        checkedAt: '2026-08-03T10:00:00.000Z',
      })(allowAuditLogging);

    it('turns the audit logger off', () => {
      expect(loggingConfig().loggers![0].level).toEqual('off');
    });

    it('does not register the file appender at all', () => {
      // Core instantiates every appender in the map regardless of logger levels, so leaving the
      // file appender configured would construct the object whose stream crashes the process.
      expect((loggingConfig().appenders as any).auditTrailAppender.type).toEqual('console');
    });

    it('still registers the audit appender key the logger references', () => {
      const { appenders, loggers } = loggingConfig();

      expect(loggers![0].appenders).toEqual(['auditTrailAppender']);
      expect(Object.keys(appenders as object)).toContain('auditTrailAppender');
    });
  });

  it('is unaffected when there is nothing to probe', () => {
    const consoleConfig = auditConfig({ type: 'console', layout: { type: 'pattern' } } as any);

    const loggingConfig = createLoggingConfig(consoleConfig, undefined)(allowAuditLogging);

    expect((loggingConfig.appenders as any).auditTrailAppender.type).toEqual('console');
    expect(loggingConfig.loggers![0].level).toEqual('info');
  });
});

// `root` bypasses permission bits, so a chmod-ed directory would still be writable.
const describeUnlessRoot = process.getuid?.() === 0 ? describe.skip : describe;

describeUnlessRoot('AuditService on a read-only filesystem', () => {
  const logger = loggingSystemMock.createLogger();
  const http = httpServiceMock.createSetupContract();

  let testDir: string;
  let logDir: string;
  let logPath: string;
  let logging: ReturnType<typeof coreMock.createSetup>['logging'];
  let status: ReturnType<typeof statusServiceMock.createSetupContract>;
  let audit: AuditService;

  const setupAudit = (features$: BehaviorSubject<SecurityLicenseFeatures>) => {
    const license = licenseMock.create();
    (license as any).features$ = features$;

    audit = new AuditService(logger);
    audit.setup({
      license,
      config: auditConfig(rollingFileAppender(logPath)),
      logging,
      http,
      status,
      getCurrentUser: jest.fn(),
      getSpaceId: jest.fn(),
      getSID: jest.fn(),
      recordAuditLoggingUsage: jest.fn(),
    });
  };

  const reportedStatus = async (): Promise<ServiceStatus> => {
    expect(status.set).toHaveBeenCalledTimes(1);
    return firstValueFrom(status.set.mock.calls[0][0]);
  };

  const lastLoggingConfig = async (): Promise<LoggerContextConfigInput> => {
    const config$ = logging.configure.mock.calls.at(-1)![0];
    return (await firstValueFrom(config$)) as LoggerContextConfigInput;
  };

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kbn-audit-rofs-'));
    logDir = join(testDir, 'logs');
    mkdirSync(logDir);
    logPath = join(logDir, 'audit.log');
    logging = coreMock.createSetup().logging;
    status = statusServiceMock.createSetupContract();
  });

  afterEach(() => {
    audit?.stop();
    for (const dir of [logDir, testDir]) {
      if (existsSync(dir)) {
        chmodSync(dir, 0o755);
      }
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  it('configures the file appender normally when the directory is writable', async () => {
    setupAudit(new BehaviorSubject(allowAuditLogging));

    const { appenders, loggers } = await lastLoggingConfig();
    expect((appenders as any).auditTrailAppender.type).toEqual('rolling-file');
    expect(loggers![0].level).toEqual('info');
  });

  it('leaves the plugin status alone when the directory is writable', async () => {
    setupAudit(new BehaviorSubject(allowAuditLogging));

    // Falls back to the status Core derives from the plugin's dependencies.
    expect((await reportedStatus()).level).toEqual(ServiceStatusLevels.available);
  });

  describe('when the audit log directory is read-only at boot', () => {
    beforeEach(() => {
      chmodSync(logDir, 0o555);
    });

    it('turns the audit logger off instead of configuring a file appender', async () => {
      setupAudit(new BehaviorSubject(allowAuditLogging));

      const { appenders, loggers } = await lastLoggingConfig();
      expect(loggers![0].level).toEqual('off');
      expect((appenders as any).auditTrailAppender.type).toEqual('console');
    });

    it('reports the plugin as degraded', async () => {
      setupAudit(new BehaviorSubject(allowAuditLogging));

      const reported = await reportedStatus();

      expect(reported.level).toEqual(ServiceStatusLevels.degraded);
      expect(reported.summary).toEqual('Audit log cannot be written');
    });

    it('names the failing file and error in the reported status', async () => {
      setupAudit(new BehaviorSubject(allowAuditLogging));

      const reported = await reportedStatus();

      expect(reported.detail).toContain('EACCES');
      expect(reported.detail).toContain(logPath);
      expect(reported.meta).toEqual({
        auditLogWriteAccess: {
          granted: false,
          path: logPath,
          code: 'EACCES',
          reason: expect.stringContaining('permission denied'),
          checkedAt: expect.any(String),
        },
      });
    });

    it('does not create the audit log file', async () => {
      setupAudit(new BehaviorSubject(allowAuditLogging));
      await lastLoggingConfig();

      expect(existsSync(logPath)).toBe(false);
    });
  });

  it('re-probes when the license changes and recovers if the directory became writable', async () => {
    chmodSync(logDir, 0o555);
    const features$ = new BehaviorSubject(allowAuditLogging);
    setupAudit(features$);

    expect((await lastLoggingConfig()).loggers![0].level).toEqual('off');

    chmodSync(logDir, 0o755);
    features$.next({ allowAuditLogging: false } as SecurityLicenseFeatures);
    features$.next(allowAuditLogging);

    const { appenders, loggers } = await lastLoggingConfig();
    expect((appenders as any).auditTrailAppender.type).toEqual('rolling-file');
    expect(loggers![0].level).toEqual('info');
  });
});
