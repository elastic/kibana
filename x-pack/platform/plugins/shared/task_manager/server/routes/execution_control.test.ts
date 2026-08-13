/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SecurityServiceStart } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { executionControlRoutes } from './execution_control';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { taskExecutionControlServiceMock } from '../execution_control/task_execution_control_service.mock';

const createDefinitions = () => {
  const definitions = new TaskTypeDictionary(loggingSystemMock.createLogger());
  definitions.registerTaskDefinitions({
    foo: { title: 'foo', createTaskRunner: jest.fn() },
    bar: { title: 'bar', createTaskRunner: jest.fn() },
  });
  return definitions;
};

const createSecurity = (username = 'operator') =>
  ({
    authc: { getCurrentUser: () => ({ username }) },
  } as unknown as SecurityServiceStart);

const setup = (serviceOverrides = {}) => {
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.createLogger();
  const service = { ...taskExecutionControlServiceMock.create(), ...serviceOverrides };

  executionControlRoutes({
    router,
    logger,
    getSecurity: async () => createSecurity(),
    getExecutionControlService: async () => service as never,
    getDefinitions: createDefinitions,
  });

  return { router, service, logger };
};

const getRoute = (
  router: ReturnType<typeof httpServiceMock.createRouter>,
  method: 'get' | 'post',
  path: string
) => {
  const calls = method === 'get' ? router.get.mock.calls : router.post.mock.calls;
  const call = calls.find(([config]) => config.path === path);
  if (!call) {
    throw new Error(`route ${path} not registered`);
  }
  // The handler's request type is method-specific; loosen it for the test driver.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { config: call[0], handler: call[1] as (...args: any[]) => Promise<unknown> };
};

describe('executionControlRoutes', () => {
  it('registers all three routes as internal, superuser-gated', () => {
    const { router } = setup();
    const paths = [
      ...router.get.mock.calls.map(([c]) => c),
      ...router.post.mock.calls.map(([c]) => c),
    ];
    expect(paths).toHaveLength(3);
    for (const config of paths) {
      expect(config.options?.access).toBe('internal');
      expect(config.security).toEqual({
        authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
      });
    }
  });

  describe('_status', () => {
    it('returns the persisted state', async () => {
      const { router, service } = setup();
      (service.read as jest.Mock).mockResolvedValue({
        paused: true,
        paused_task_types: ['foo'],
        updated_at: '2024-01-01T00:00:00.000Z',
        updated_by: 'operator',
      });
      const { handler } = getRoute(router, 'get', '/internal/task_manager/execution/_status');
      const [ctx, req, res] = mockHandlerArguments({}, {}, ['ok']);

      await handler(ctx, req, res);

      expect(res.ok).toHaveBeenCalledWith({
        body: {
          paused: true,
          paused_task_types: ['foo'],
          updated_at: '2024-01-01T00:00:00.000Z',
          updated_by: 'operator',
        },
      });
    });
  });

  describe('_pause', () => {
    it('globally pauses when no task types are given', async () => {
      const { router, service } = setup();
      (service.update as jest.Mock).mockImplementation(async (mutator) => {
        const next = mutator({ paused: false, pausedTaskTypes: [] });
        return { paused: next.paused, paused_task_types: next.pausedTaskTypes, updated_at: 'x' };
      });
      const { handler } = getRoute(router, 'post', '/internal/task_manager/execution/_pause');
      const [ctx, req, res] = mockHandlerArguments({}, { body: {} }, ['ok', 'badRequest']);

      await handler(ctx, req, res);

      const mutator = (service.update as jest.Mock).mock.calls[0][0];
      expect(mutator({ paused: false, pausedTaskTypes: ['keep'] })).toEqual({
        paused: true,
        pausedTaskTypes: ['keep'],
      });
      expect(res.ok).toHaveBeenCalled();
    });

    it('unions requested task types into the paused list', async () => {
      const { router, service } = setup();
      (service.update as jest.Mock).mockResolvedValue({
        paused: false,
        paused_task_types: ['foo'],
        updated_at: 'x',
      });
      const { handler } = getRoute(router, 'post', '/internal/task_manager/execution/_pause');
      const [ctx, req, res] = mockHandlerArguments({}, { body: { task_types: ['foo'] } }, [
        'ok',
        'badRequest',
      ]);

      await handler(ctx, req, res);

      const mutator = (service.update as jest.Mock).mock.calls[0][0];
      expect(mutator({ paused: false, pausedTaskTypes: ['bar'] })).toEqual({
        paused: false,
        pausedTaskTypes: ['bar', 'foo'],
      });
    });

    it('rejects unknown task types with a 400', async () => {
      const { router, service } = setup();
      const { handler } = getRoute(router, 'post', '/internal/task_manager/execution/_pause');
      const [ctx, req, res] = mockHandlerArguments({}, { body: { task_types: ['nope'] } }, [
        'ok',
        'badRequest',
      ]);

      await handler(ctx, req, res);

      expect(res.badRequest).toHaveBeenCalledWith({
        body: 'Unknown task types: nope',
      });
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('_resume', () => {
    it('clears the global pause and all paused types on a full resume', async () => {
      const { router, service } = setup();
      (service.update as jest.Mock).mockResolvedValue({
        paused: false,
        paused_task_types: [],
        updated_at: 'x',
      });
      const { handler } = getRoute(router, 'post', '/internal/task_manager/execution/_resume');
      const [ctx, req, res] = mockHandlerArguments({}, { body: {} }, ['ok']);

      await handler(ctx, req, res);

      const mutator = (service.update as jest.Mock).mock.calls[0][0];
      expect(mutator({ paused: true, pausedTaskTypes: ['foo', 'bar'] })).toEqual({
        paused: false,
        pausedTaskTypes: [],
      });
    });

    it('removes only the requested task types', async () => {
      const { router, service } = setup();
      (service.update as jest.Mock).mockResolvedValue({
        paused: false,
        paused_task_types: ['bar'],
        updated_at: 'x',
      });
      const { handler } = getRoute(router, 'post', '/internal/task_manager/execution/_resume');
      const [ctx, req, res] = mockHandlerArguments({}, { body: { task_types: ['foo'] } }, ['ok']);

      await handler(ctx, req, res);

      const mutator = (service.update as jest.Mock).mock.calls[0][0];
      expect(mutator({ paused: true, pausedTaskTypes: ['foo', 'bar'] })).toEqual({
        paused: true,
        pausedTaskTypes: ['bar'],
      });
    });

    it('accepts unknown task types (does not validate), so a stranded paused type can be cleared', async () => {
      const { router, service } = setup();
      (service.update as jest.Mock).mockResolvedValue({
        paused: false,
        paused_task_types: [],
        updated_at: 'x',
      });
      const { handler } = getRoute(router, 'post', '/internal/task_manager/execution/_resume');
      const [ctx, req, res] = mockHandlerArguments({}, { body: { task_types: ['gone:type'] } }, [
        'ok',
        'badRequest',
      ]);

      await handler(ctx, req, res);

      expect(res.badRequest).not.toHaveBeenCalled();
      const mutator = (service.update as jest.Mock).mock.calls[0][0];
      // Removing an unknown/stranded type leaves other paused types intact.
      expect(mutator({ paused: false, pausedTaskTypes: ['gone:type', 'keep:type'] })).toEqual({
        paused: false,
        pausedTaskTypes: ['keep:type'],
      });
      expect(res.ok).toHaveBeenCalled();
    });
  });
});
