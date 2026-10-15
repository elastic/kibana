/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync } from 'fs';
import type { Socket } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { BehaviorSubject, Observable } from 'rxjs';

import type { LoggerContextConfigInput, ServiceStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { coreMock, statusServiceMock } from '@kbn/core/server/mocks';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { AppenderConfigType, FileAppenderPluginConfig } from '@kbn/core-logging-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { SecurityLicense, SecurityLicenseFeatures } from '@kbn/security-plugin-types-common';
import type { AuditEvent } from '@kbn/security-plugin-types-server';

import {
  AuditService,
  createLoggingConfig,
  filterEvent,
  getForwardedFor,
  RECORD_USAGE_INTERVAL,
} from './audit_service';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';
import { ConfigSchema, createConfig } from '../config';

jest.useFakeTimers({ legacyFakeTimers: true });

const logger = loggingSystemMock.createLogger();
const license = licenseMock.create();

const createAuditConfig = (settings: Partial<ConfigType['audit']>) => {
  return createConfig(ConfigSchema.validate({ audit: settings }), logger, { isTLSEnabled: false })
    .audit;
};

const config = createAuditConfig({ enabled: true });
const { logging } = coreMock.createSetup();
const status = statusServiceMock.createSetupContract();
const http = httpServiceMock.createSetupContract();
const getCurrentUser = jest
  .fn()
  .mockReturnValue({ username: 'jdoe', roles: ['admin'], profile_uid: 'uid' });
const getSpaceId = jest.fn().mockReturnValue('default');
const getSID = jest.fn().mockResolvedValue('SESSION_ID');
const recordAuditLoggingUsage = jest.fn();

beforeEach(() => {
  logger.info.mockClear();
  logging.configure.mockClear();
  logger.isLevelEnabled.mockClear().mockReturnValue(true);
  recordAuditLoggingUsage.mockClear();
  http.registerOnPostAuth.mockClear();
});

describe('#setup', () => {
  it('returns the expected contract', () => {
    const audit = new AuditService(logger);
    expect(
      audit.setup({
        license,
        config,
        logging,
        status,
        http,
        getCurrentUser,
        getSpaceId,
        getSID,
        recordAuditLoggingUsage,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "asScoped": [Function],
        "withoutRequest": Object {
          "enabled": true,
          "includeSavedObjectNames": true,
          "log": [Function],
        },
      }
    `);
    audit.stop();
  });

  it('configures logging correctly when using ecs logger', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'pattern',
          },
        },
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(logging.configure).toHaveBeenCalledWith(expect.any(Observable));
    audit.stop();
  });

  it('records feature usage correctly when using ecs logger', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license: licenseMock.create({
        allowAuditLogging: true,
      }),
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'pattern',
          },
        },
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(3);
    audit.stop();
  });

  it('does not record feature usage when disabled', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config: {
        enabled: false,
        include_saved_object_names: false,
        appender: undefined,
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    audit.stop();
  });

  it('registers post auth hook', () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(http.registerOnPostAuth).toHaveBeenCalledWith(expect.any(Function));
    audit.stop();
  });
});

describe('#asScoped', () => {
  it('logs event enriched with meta data from request', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      socket: { remoteAddress: '3.3.3.3' } as Socket,
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      },
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
      http: { request: { method: 'GET' } },
    });
    expect(logger.info).toHaveBeenLastCalledWith('MESSAGE', {
      event: { action: 'ACTION' },
      kibana: { space_id: 'default', session_id: 'SESSION_ID' },
      trace: { id: 'REQUEST_ID' },
      client: { ip: '3.3.3.3' },
      http: {
        request: { method: 'GET', headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' } },
      },
      user: { id: 'uid', name: 'jdoe', roles: ['admin'] },
    });
    audit.stop();
  });

  it('logs event enriched with meta data from fake request', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId: () => undefined,
      getSID: () => Promise.resolve(undefined),
      recordAuditLoggingUsage,
    });

    const fakeRawRequest: FakeRawRequest = {
      headers: {},
    };
    const request = kibanaRequestFactory(fakeRawRequest);

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
    });
    expect(logger.info).toHaveBeenLastCalledWith('MESSAGE', {
      client: {
        ip: undefined,
      },
      event: {
        action: 'ACTION',
      },
      http: undefined,
      kibana: {
        session_id: undefined,
        space_id: undefined,
      },
      trace: {
        id: expect.any(String),
      },
      user: {
        id: 'uid',
        name: 'jdoe',
        roles: ['admin'],
      },
    });
    audit.stop();
  });

  it('logs space_id from a fake request that carries a spaceId', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser,
      // Mirror real wiring (spacesService.getSpaceId) by sourcing the space id
      // directly from the request.
      getSpaceId: (req) => req.spaceId,
      getSID: () => Promise.resolve(undefined),
      recordAuditLoggingUsage,
    });

    const fakeRawRequest: FakeRawRequest = {
      headers: {},
      spaceId: asSpaceId('my-space'),
    };
    const request = kibanaRequestFactory(fakeRawRequest);

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
    });
    expect(logger.info).toHaveBeenLastCalledWith(
      'MESSAGE',
      expect.objectContaining({
        kibana: expect.objectContaining({ space_id: 'my-space' }),
      })
    );
    audit.stop();
  });

  it('does not log to audit logger if event matches ignore filter', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if no event was generated', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log(undefined);
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if info logging level is disabled', async () => {
    logger.isLevelEnabled.mockReturnValue(false);

    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      socket: { remoteAddress: '3.3.3.3' } as Socket,
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      },
      kibanaRequestState: {
        requestId: 'REQUEST_ID',
        requestUuid: 'REQUEST_UUID',
        startTime: Date.now(),
      },
    });

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
      http: { request: { method: 'GET' } },
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.isLevelEnabled).toHaveBeenCalledTimes(1);
    expect(logger.isLevelEnabled).toHaveBeenCalledWith('info');

    audit.stop();
  });
});

describe('#withoutRequest', () => {
  it('logs event without additional meta data', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).toHaveBeenCalledWith('MESSAGE', {
      event: { action: 'ACTION' },
    });
    audit.stop();
  });

  it('does not log to audit logger if event matches ignore filter', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    await auditSetup.withoutRequest.log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if no event was generated', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      status,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    await auditSetup.withoutRequest.log(undefined);
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });
});

describe('#createLoggingConfig', () => {
  test('sets log level to `info` when audit logging is enabled and appender is defined', () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig({
      enabled: true,
      include_saved_object_names: false,
      appender: {
        type: 'console',
        layout: {
          type: 'pattern',
        },
      },
    })(features);

    expect(loggingConfig).toMatchInlineSnapshot(`
      Object {
        "appenders": Object {
          "auditTrailAppender": Object {
            "layout": Object {
              "type": "pattern",
            },
            "type": "console",
          },
        },
        "loggers": Array [
          Object {
            "appenders": Array [
              "auditTrailAppender",
            ],
            "level": "info",
            "name": "audit.ecs",
          },
        ],
      }
    `);
  });

  test('sets log level to `off` when audit logging is disabled', () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig({
      enabled: false,
      include_saved_object_names: false,
      appender: {
        type: 'console',
        layout: {
          type: 'pattern',
        },
      },
    })(features);

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });

  test('sets log level to `off` when license does not allow audit logging', () => {
    const features = { allowAuditLogging: false };

    const loggingConfig = createLoggingConfig({
      enabled: true,
      include_saved_object_names: false,
      appender: {
        type: 'console',
        layout: {
          type: 'pattern',
        },
      },
    })(features);

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });
});

describe('#getForwardedFor', () => {
  it('extracts x-forwarded-for header from request', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: {
        'x-forwarded-for': '1.1.1.1',
      },
    });
    expect(getForwardedFor(request)).toBe('1.1.1.1');
  });

  it('concatenates multiple headers into single string in correct order', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: {
        // @ts-expect-error Headers can be arrays but HAPI mocks are incorrectly typed
        'x-forwarded-for': ['1.1.1.1, 2.2.2.2', '3.3.3.3'],
      },
    });
    expect(getForwardedFor(request)).toBe('1.1.1.1, 2.2.2.2, 3.3.3.3');
  });

  it('returns undefined when header not present', () => {
    const request = httpServerMock.createKibanaRequest();
    expect(getForwardedFor(request)).toBeUndefined();
  });
});

describe('#filterEvent', () => {
  let event: AuditEvent;

  beforeEach(() => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };
  });

  test('keeps event when ignore filters are undefined or empty', () => {
    expect(filterEvent(event, undefined)).toBeTruthy();
    expect(filterEvent(event, [])).toBeTruthy();
  });

  test('filters event correctly when a single match is found per criteria', () => {
    expect(filterEvent(event, [{ actions: ['NO_MATCH'] }])).toBeTruthy();
    expect(filterEvent(event, [{ actions: ['NO_MATCH', 'http_request'] }])).toBeFalsy();
    expect(filterEvent(event, [{ categories: ['NO_MATCH', 'web'] }])).toBeFalsy();
    expect(filterEvent(event, [{ types: ['NO_MATCH', 'access'] }])).toBeFalsy();
    expect(filterEvent(event, [{ outcomes: ['NO_MATCH', 'success'] }])).toBeFalsy();
    expect(filterEvent(event, [{ spaces: ['NO_MATCH', 'default'] }])).toBeFalsy();
    expect(filterEvent(event, [{ users: ['NO_MATCH', 'jdoe'] }])).toBeFalsy();
  });

  test('keeps event when one criteria per rule does not match', () => {
    expect(
      filterEvent(event, [
        {
          actions: ['NO_MATCH'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['NO_MATCH'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['NO_MATCH'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['NO_MATCH'],
          spaces: ['default'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['NO_MATCH'],
          users: ['jdoe'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['NO_MATCH'],
        },
      ])
    ).toBeTruthy();
  });

  test('keeps event when one item per category does not match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['authentication', 'web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web', 'NO_MATCH'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeTruthy();
  });

  test('keeps event when one item per type does not match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access', 'user'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access', 'NO_MATCH'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeTruthy();
  });

  test('filters out event when all criteria in a single rule match', () => {
    expect(
      filterEvent(event, [
        {
          actions: ['NO_MATCH'],
          categories: ['NO_MATCH'],
          types: ['NO_MATCH'],
          outcomes: ['NO_MATCH'],
          spaces: ['NO_MATCH'],
          users: ['NO_MATCH'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeFalsy();
  });

  test('filters out event when all categories match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['authentication', 'web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['authentication', 'web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
          users: ['jdoe'],
        },
      ])
    ).toBeFalsy();
  });

  test('filters out event when all types match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access', 'user'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access', 'user'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeFalsy();
  });
});

describe('runtime audit log write failures', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kbn-audit-service-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const setupWithFileAppender = (
    securityLicense: SecurityLicense = licenseMock.create({ allowAuditLogging: true })
  ) => {
    const fileName = join(testDir, 'audit.log');
    const audit = new AuditService(logger);
    const statusMock = statusServiceMock.createSetupContract();

    audit.setup({
      license: securityLicense,
      config: createAuditConfig({
        enabled: true,
        appender: { type: 'file', fileName, layout: { type: 'json' } },
      }),
      logging,
      status: statusMock,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    const loggingConfigs: LoggerContextConfigInput[] = [];
    (logging.configure.mock.calls[0][0] as Observable<LoggerContextConfigInput>).subscribe((c) =>
      loggingConfigs.push(c)
    );

    const statuses: ServiceStatus[] = [];
    (statusMock.set.mock.calls[0][0] as Observable<ServiceStatus>).subscribe((s) =>
      statuses.push(s)
    );

    return { audit, fileName, loggingConfigs, statuses };
  };

  const auditAppender = (loggerContextConfig: LoggerContextConfigInput) =>
    (loggerContextConfig.appenders as Record<string, FileAppenderPluginConfig>).auditTrailAppender;

  it('hands the appender an `onWriteError` handler so a mid-write failure cannot crash Kibana', () => {
    const { audit, loggingConfigs } = setupWithFileAppender();

    const appender = auditAppender(loggingConfigs[0]);

    expect(appender.type).toEqual('file');
    expect(appender.onWriteError).toEqual(expect.any(Function));
    audit.stop();
  });

  it('reports degraded when the appender fails mid-write, not only at startup', () => {
    const { audit, fileName, loggingConfigs, statuses } = setupWithFileAppender();
    const { onWriteError } = auditAppender(loggingConfigs[0]);

    expect(statuses.at(-1)!.level).toEqual(ServiceStatusLevels.available);

    onWriteError!({ path: fileName, code: 'ENOSPC', reason: 'ENOSPC: no space left on device' });

    expect(statuses.at(-1)!.level).toEqual(ServiceStatusLevels.degraded);
    expect(statuses.at(-1)!.summary).toEqual('Audit log cannot be written');
    expect(statuses.at(-1)!.detail).toContain('ENOSPC');
    audit.stop();
  });

  it('turns the audit logger off once a write has failed, so the appender stops being used', () => {
    const { audit, fileName, loggingConfigs } = setupWithFileAppender();
    const { onWriteError } = auditAppender(loggingConfigs[0]);

    expect(loggingConfigs[0].loggers![0].level).toEqual('info');

    onWriteError!({ path: fileName, code: 'EROFS', reason: 'EROFS: read-only file system' });

    expect(loggingConfigs.at(-1)!.loggers![0].level).toEqual('off');
    audit.stop();
  });

  it('reconfigures the logger only once, no matter how many writes fail before it goes off', () => {
    const { audit, fileName, loggingConfigs } = setupWithFileAppender();
    const { onWriteError } = auditAppender(loggingConfigs[0]);
    const configCount = loggingConfigs.length;

    // The appender now discards an errored stream and reopens the file, so records still in flight
    // before the logger turns off each report a failure.
    onWriteError!({ path: fileName, code: 'ENOSPC', reason: 'ENOSPC: no space left on device' });
    onWriteError!({ path: fileName, code: 'ENOSPC', reason: 'ENOSPC: no space left on device' });
    onWriteError!({ path: fileName, code: 'ENOSPC', reason: 'ENOSPC: no space left on device' });

    expect(loggingConfigs).toHaveLength(configCount + 1);
    expect(loggingConfigs.at(-1)!.loggers![0].level).toEqual('off');
    audit.stop();
  });

  it('stays paused across a license change, since the probe cannot see a full disk', () => {
    const features$ = new BehaviorSubject({
      allowAuditLogging: true,
    } as SecurityLicenseFeatures);
    const { audit, fileName, loggingConfigs, statuses } = setupWithFileAppender(
      licenseMock.create(features$)
    );
    const { onWriteError } = auditAppender(loggingConfigs[0]);

    onWriteError!({ path: fileName, code: 'ENOSPC', reason: 'ENOSPC: no space left on device' });

    expect(loggingConfigs.at(-1)!.loggers![0].level).toEqual('off');
    expect(statuses.at(-1)!.level).toEqual(ServiceStatusLevels.degraded);

    features$.next({ allowAuditLogging: false } as SecurityLicenseFeatures);
    features$.next({ allowAuditLogging: true } as SecurityLicenseFeatures);

    expect(loggingConfigs.at(-1)!.loggers![0].level).toEqual('off');
    expect(auditAppender(loggingConfigs.at(-1)!).type).toEqual('console');
    expect(statuses.at(-1)!.level).toEqual(ServiceStatusLevels.degraded);
    audit.stop();
  });

  it('always installs its own handler, ignoring anything an operator put in the appender config', () => {
    const operatorHandler = jest.fn();
    const auditHandler = jest.fn();
    const auditConfig = createAuditConfig({
      enabled: true,
      appender: {
        type: 'file',
        fileName: join(testDir, 'audit.log'),
        layout: { type: 'json' },
        onWriteError: operatorHandler,
      } as AppenderConfigType,
    });

    const loggingConfig = createLoggingConfig(
      auditConfig,
      undefined,
      auditHandler
    )({ allowAuditLogging: true });
    auditAppender(loggingConfig).onWriteError!({ path: 'audit.log', reason: 'ENOSPC' });

    expect(auditHandler).toHaveBeenCalledTimes(1);
    expect(operatorHandler).not.toHaveBeenCalled();
  });
});
