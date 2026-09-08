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
import { Observable } from 'rxjs';

import type { LoggerContextConfigInput, ServiceStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { coreMock, statusServiceMock } from '@kbn/core/server/mocks';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type {
  AppenderConfigType,
  FileAppenderPluginConfig,
  OtelAppenderPluginConfig,
} from '@kbn/core-logging-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { AuditEvent } from '@kbn/security-plugin-types-server';

import {
  applyAuditOtelFieldMap,
  AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
  AUDIT_OTEL_RESOURCE_ATTRIBUTES,
} from './audit_otel_transform';
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

  it('includes user.email when the current user has an email', async () => {
    const getCurrentUserWithEmail = jest.fn().mockReturnValue({
      username: 'jdoe',
      roles: ['admin'],
      profile_uid: 'uid',
      email: 'jdoe@example.com',
    });
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser: getCurrentUserWithEmail,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest();

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
    });
    expect(logger.info).toHaveBeenLastCalledWith(
      'MESSAGE',
      expect.objectContaining({
        user: { id: 'uid', name: 'jdoe', email: 'jdoe@example.com', roles: ['admin'] },
      })
    );
    audit.stop();
  });

  it('includes user.full_name when the current user has one', async () => {
    const getCurrentUserWithFullName = jest.fn().mockReturnValue({
      username: 'jdoe',
      roles: ['admin'],
      profile_uid: 'uid',
      full_name: 'Jane Doe',
    });
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      status,
      http,
      getCurrentUser: getCurrentUserWithFullName,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest();

    await auditSetup.asScoped(request).log({
      message: 'MESSAGE',
      event: { action: 'ACTION' },
    });
    expect(logger.info).toHaveBeenLastCalledWith(
      'MESSAGE',
      expect.objectContaining({
        user: { id: 'uid', name: 'jdoe', full_name: 'Jane Doe', roles: ['admin'] },
      })
    );
    audit.stop();
  });

  describe('user.domain (Serverless OTel only)', () => {
    const getCurrentUserWithRealm = jest.fn().mockReturnValue({
      username: 'jdoe',
      roles: ['admin'],
      profile_uid: 'uid',
      authentication_realm: { name: 'cloud-saml-kibana', type: 'saml' },
    });

    const logWithConfig = async (
      auditConfig: Partial<ConfigType['audit']>,
      isServerless: boolean
    ) => {
      const audit = new AuditService(logger);
      const auditSetup = audit.setup({
        license,
        config: createAuditConfig(auditConfig),
        logging,
        status,
        http,
        isServerless,
        getCurrentUser: getCurrentUserWithRealm,
        getSpaceId,
        getSID,
        recordAuditLoggingUsage,
      });

      await auditSetup
        .asScoped(httpServerMock.createKibanaRequest())
        .log({ message: 'MESSAGE', event: { action: 'ACTION' } });
      audit.stop();

      return (logger.info.mock.calls[logger.info.mock.calls.length - 1][1] as { user: object })
        .user;
    };

    const otelAppender = {
      enabled: true,
      appender: { type: 'otel' as const, protocol: 'http' as const, url: 'http://collector:4318' },
    };

    it('includes the authentication realm when serverless and shipping to OTel', async () => {
      expect(await logWithConfig(otelAppender, true)).toEqual({
        id: 'uid',
        name: 'jdoe',
        domain: 'cloud-saml-kibana',
        roles: ['admin'],
      });
    });

    it('omits it when serverless but not shipping to OTel', async () => {
      const user = await logWithConfig({ enabled: true }, true);
      expect(user).not.toHaveProperty('domain');
    });

    it('omits it when shipping to OTel but not serverless', async () => {
      const user = await logWithConfig(otelAppender, false);
      expect(user).not.toHaveProperty('domain');
    });
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

  test('injects the audit OTel attribute transform when serverless and using an OTel appender', async () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig(
      {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'otel',
          protocol: 'http',
          url: 'http://collector:4318/v1/logs',
        },
      },
      true
    )(features);

    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    const otelAppender = appenders.auditTrailAppender as OtelAppenderPluginConfig;
    expect(otelAppender.transformAttributes).toBe(applyAuditOtelFieldMap);
  });

  test('the injected transform maps flattened audit attributes to the Serverless field set', async () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig(
      {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'otel',
          protocol: 'http',
          url: 'http://collector:4318/v1/logs',
        },
      },
      true
    )(features);

    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    const otelAppender = appenders.auditTrailAppender as OtelAppenderPluginConfig;
    const transform = otelAppender.transformAttributes;
    if (!transform) {
      throw new Error('expected transformAttributes to be injected for a serverless OTel appender');
    }
    const transformed = transform({
      'log.logger': 'plugins.security.audit.ecs',
      'kibana.space_id': 'default',
      'client.ip': '1.2.3.4',
      'http.request.method': 'get',
      'url.scheme': 'http',
      'url.domain': 'localhost',
      'url.path': '/api/status',
    });

    // Spot-check each stage of the pipeline: rename, fan-out, addition, drop, default, uppercase.
    expect(transformed).toEqual({
      'kibana.space.id': 'default',
      'source.address': '1.2.3.4',
      'source.ip': '1.2.3.4',
      'http.request.method': 'GET',
      'url.original': 'http://localhost/api/status',
      'event.type': ['access'],
      'log.type': 'audit',
    });
  });

  test('does not inject the audit transform for non-OTel appenders', async () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig({
      enabled: true,
      include_saved_object_names: false,
      appender: {
        type: 'console',
        layout: { type: 'pattern' },
      },
    })(features);

    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    expect(appenders.auditTrailAppender).not.toHaveProperty('transformAttributes');
  });

  test('injects a minimal resource allowlist + attributes when using an OTel appender', () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig(
      {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'otel',
          protocol: 'http',
          url: 'http://collector:4318/v1/logs',
        },
      },
      true
    )(features);

    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    const otelAppender = appenders.auditTrailAppender as OtelAppenderPluginConfig;
    // includeResources keeps the audit resource attribute keys plus the promoted keys (so project.id
    // stays in the resource for log delivery); attributes supply the service.name/service.type values.
    expect(otelAppender.includeResources).toEqual([
      ...Object.keys(AUDIT_OTEL_RESOURCE_ATTRIBUTES),
      ...AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
    ]);
    expect(otelAppender.attributes).toEqual(AUDIT_OTEL_RESOURCE_ATTRIBUTES);
    // project.id is also copied into per-record attributes (kept in both places).
    expect(otelAppender.promoteResourceAttributes).toEqual(AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES);
  });

  test('merges user-provided attributes with audit resource attributes', () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig(
      {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'otel',
          protocol: 'http',
          url: 'http://collector:4318/v1/logs',
          attributes: { 'custom.attr': 'value' },
        },
      },
      true
    )(features);

    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    const otelAppender = appenders.auditTrailAppender as OtelAppenderPluginConfig;
    expect(otelAppender.attributes).toEqual({
      'custom.attr': 'value',
      ...AUDIT_OTEL_RESOURCE_ATTRIBUTES,
    });
    // includeResources must cover ALL configured attribute keys — not just the audit two — plus the
    // promoted keys, so a deployment-provided resource attribute (e.g. project.id) is not stripped.
    expect(otelAppender.includeResources).toEqual([
      'custom.attr',
      ...Object.keys(AUDIT_OTEL_RESOURCE_ATTRIBUTES),
      ...AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
    ]);
  });

  test('does not inject the transform, includeResources or promoteResourceAttributes for non-OTel appenders', async () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig({
      enabled: true,
      include_saved_object_names: false,
      appender: {
        type: 'console',
        layout: { type: 'pattern' },
      },
    })(features);

    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    expect(appenders.auditTrailAppender).not.toHaveProperty('transformAttributes');
    expect(appenders.auditTrailAppender).not.toHaveProperty('includeResources');
    expect(appenders.auditTrailAppender).not.toHaveProperty('promoteResourceAttributes');
  });

  test('does not inject audit transforms for an OTel appender when not serverless', () => {
    const features = { allowAuditLogging: true };

    const loggingConfig = createLoggingConfig(
      {
        enabled: true,
        include_saved_object_names: false,
        appender: {
          type: 'otel',
          protocol: 'http',
          url: 'http://collector:4318/v1/logs',
        },
      },
      // not serverless — the OTel appender is left untouched
      false
    )(features);

    // The transform is Serverless-only: on other build flavors the OTel appender passes through
    // unchanged (full resource, raw ECS field names).
    const appenders = loggingConfig.appenders as Record<string, AppenderConfigType>;
    const otelAppender = appenders.auditTrailAppender as OtelAppenderPluginConfig;
    expect(otelAppender).not.toHaveProperty('transformAttributes');
    expect(otelAppender).not.toHaveProperty('includeResources');
    expect(otelAppender).not.toHaveProperty('promoteResourceAttributes');
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

  const setupWithFileAppender = () => {
    const fileName = join(testDir, 'audit.log');
    const audit = new AuditService(logger);
    const statusMock = statusServiceMock.createSetupContract();

    audit.setup({
      license: licenseMock.create({ allowAuditLogging: true }),
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
      false,
      undefined,
      auditHandler
    )({ allowAuditLogging: true });
    auditAppender(loggingConfig).onWriteError!({ path: 'audit.log', reason: 'ENOSPC' });

    expect(auditHandler).toHaveBeenCalledTimes(1);
    expect(operatorHandler).not.toHaveBeenCalled();
  });
});
