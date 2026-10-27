/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID,
} from '@kbn/management-settings-ids';
import {
  MEMORY_DREAMING_DISABLE_PATH,
  MEMORY_DREAMING_ENABLE_PATH,
  MEMORY_DREAMING_PATH,
  MEMORY_DREAMING_RUN_PATH,
  MEMORY_FORGET_PATH,
  MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { MemoryDreamingScheduler } from '../memory/dreaming/schedule';
import {
  MemoryConflictError,
  MemoryDisabledError,
  MemoryForbiddenError,
  MemoryNotFoundError,
  MemoryValidationError,
} from '../memory/errors';
import { registerMemoryRoutes } from './memory';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
}

describe('memory routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let settings: Record<string, unknown>;
  let memoryEnabled: boolean;
  let auditLog: jest.Mock;
  let memoryService: { remember: jest.Mock; forget: jest.Mock };
  let scheduler: jest.Mocked<MemoryDreamingScheduler>;
  const enabledBy = { id: 'u1', username: 'elastic' };
  const status = { enabled: true, interval: '24h' };

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: { client: { get: jest.fn(async (key: string) => settings[key]) } },
        security: { audit: { logger: { log: auditLog } } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (method: string, path: string): RegisteredRoute => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (method: string, path: string, body?: Record<string, unknown>) => {
    const request = httpServerMock.createKibanaRequest({ body });
    await getRoute(method, path).handler(createContext(), request, response);
    return request;
  };

  beforeEach(() => {
    routes = {};
    response = httpServerMock.createResponseFactory();
    settings = {
      [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true,
      [CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID]: '6h',
    };
    memoryEnabled = true;
    auditLog = jest.fn();
    memoryService = {
      remember: jest.fn().mockResolvedValue({ id: 'm1', session_id: 's1' }),
      forget: jest.fn().mockResolvedValue({ id: 'm1' }),
    };
    scheduler = {
      getStatus: jest.fn().mockResolvedValue(status),
      enable: jest.fn().mockResolvedValue(status),
      disable: jest.fn().mockResolvedValue({ enabled: false, interval: '6h' }),
      runNow: jest.fn().mockResolvedValue({ ...status, running: true }),
    };

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (_versionConfig: unknown, handler: RequestHandler) => {
        routes[`${method}:${config.path}`] = { config, handler };
      },
    });
    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
      },
    } as unknown as IRouter;

    registerMemoryRoutes({
      router,
      logger: loggerMock.create(),
      getSpaces: async () => undefined,
      getMemoryService: async () => memoryService,
      getDreamingScheduler: () => scheduler,
      getMemoryUser: async () => enabledBy,
      isMemoryEnabled: async () => memoryEnabled,
    });
  });

  it('registers remember and forget as public write routes', () => {
    for (const path of [MEMORY_REMEMBER_PATH, MEMORY_FORGET_PATH]) {
      expect(getRoute('POST', path).config).toMatchObject({
        access: 'public',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      });
    }
  });

  it('registers the dreaming routes as internal', () => {
    expect(getRoute('GET', MEMORY_DREAMING_PATH).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    for (const path of [
      MEMORY_DREAMING_ENABLE_PATH,
      MEMORY_DREAMING_DISABLE_PATH,
      MEMORY_DREAMING_RUN_PATH,
    ]) {
      expect(getRoute('POST', path).config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      });
    }
  });

  it('returns 404 on every route when Context Engine is disabled', async () => {
    settings[CONTEXT_ENGINE_ENABLED_SETTING_ID] = false;

    await callRoute('POST', MEMORY_REMEMBER_PATH, { type: 'memory.session' });
    await callRoute('POST', MEMORY_FORGET_PATH, { id: 'm1' });
    await callRoute('GET', MEMORY_DREAMING_PATH);

    expect(response.notFound).toHaveBeenCalledTimes(3);
    expect(memoryService.remember).not.toHaveBeenCalled();
    expect(scheduler.getStatus).not.toHaveBeenCalled();
  });

  it('remembers a memory and audits it', async () => {
    const body = { type: 'memory.session', title: 't', description: 'd', content: 'c' };

    await callRoute('POST', MEMORY_REMEMBER_PATH, body);

    expect(memoryService.remember).toHaveBeenCalledWith(body);
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 'm1', session_id: 's1' } });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_memory_remember',
          outcome: 'success',
        }),
      })
    );
  });

  it('forgets a memory', async () => {
    await callRoute('POST', MEMORY_FORGET_PATH, { id: 'm1' });

    expect(memoryService.forget).toHaveBeenCalledWith({ id: 'm1' });
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 'm1' } });
  });

  it.each([
    ['badRequest', new MemoryValidationError('bad expires_at')],
    ['forbidden', new MemoryForbiddenError()],
    ['notFound', new MemoryNotFoundError('m1')],
    ['notFound', new MemoryDisabledError()],
  ] as const)('maps errors to %s', async (method, error) => {
    memoryService.remember.mockRejectedValue(error);

    await callRoute('POST', MEMORY_REMEMBER_PATH, { type: 'memory.session' });

    expect(response[method]).toHaveBeenCalledWith({ body: { message: error.message } });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_memory_remember',
          outcome: 'failure',
        }),
      })
    );
  });

  it('returns the dreaming status with the configured interval', async () => {
    await callRoute('GET', MEMORY_DREAMING_PATH);

    expect(scheduler.getStatus).toHaveBeenCalledWith({ spaceId: 'default', interval: '6h' });
    expect(response.ok).toHaveBeenCalledWith({ body: status });
  });

  it('falls back to the default interval when the setting is invalid', async () => {
    settings[CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID] = '5m';

    await callRoute('GET', MEMORY_DREAMING_PATH);

    expect(scheduler.getStatus).toHaveBeenCalledWith({ spaceId: 'default', interval: '24h' });
  });

  it('returns 404 for dreaming status, enable and run while memory is disabled', async () => {
    memoryEnabled = false;

    await callRoute('GET', MEMORY_DREAMING_PATH);
    await callRoute('POST', MEMORY_DREAMING_ENABLE_PATH);
    await callRoute('POST', MEMORY_DREAMING_RUN_PATH);

    expect(response.notFound).toHaveBeenCalledTimes(3);
    expect(scheduler.getStatus).not.toHaveBeenCalled();
    expect(scheduler.enable).not.toHaveBeenCalled();
    expect(scheduler.runNow).not.toHaveBeenCalled();
  });

  it('turns dreaming on with the request and the calling user, on a schedule by default', async () => {
    const request = await callRoute('POST', MEMORY_DREAMING_ENABLE_PATH);

    expect(scheduler.enable).toHaveBeenCalledWith({
      request,
      spaceId: 'default',
      interval: '6h',
      enabledBy,
      scheduled: true,
      rebuild: false,
    });
    expect(response.ok).toHaveBeenCalledWith({ body: status });
  });

  it('turns dreaming on for manual runs only', async () => {
    await callRoute('POST', MEMORY_DREAMING_ENABLE_PATH, { scheduled: false });

    expect(scheduler.enable).toHaveBeenCalledWith(expect.objectContaining({ scheduled: false }));
  });

  it('turns dreaming on with rebuilds', async () => {
    await callRoute('POST', MEMORY_DREAMING_ENABLE_PATH, { scheduled: false, rebuild: true });

    expect(scheduler.enable).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled: false, rebuild: true })
    );
  });

  it('starts a dream now and audits it', async () => {
    await callRoute('POST', MEMORY_DREAMING_RUN_PATH);

    expect(scheduler.runNow).toHaveBeenCalledWith({ spaceId: 'default', interval: '6h' });
    expect(response.ok).toHaveBeenCalledWith({ body: { ...status, running: true } });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_memory_dreaming_run',
          outcome: 'success',
        }),
      })
    );
  });

  it('returns 409 when a dream is already running', async () => {
    const error = new MemoryConflictError('A dream is running. Try again when it finishes.');
    scheduler.runNow.mockRejectedValue(error);

    await callRoute('POST', MEMORY_DREAMING_RUN_PATH);

    expect(response.conflict).toHaveBeenCalledWith({ body: { message: error.message } });
  });

  it('turns dreaming off even while memory is disabled', async () => {
    memoryEnabled = false;

    await callRoute('POST', MEMORY_DREAMING_DISABLE_PATH);

    expect(scheduler.disable).toHaveBeenCalledWith({ spaceId: 'default', interval: '6h' });
    expect(response.ok).toHaveBeenCalledWith({ body: { enabled: false, interval: '6h' } });
  });
});
