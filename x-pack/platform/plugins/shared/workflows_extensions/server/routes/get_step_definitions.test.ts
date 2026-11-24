/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod/v4';
import { registerGetStepDefinitionsRoute } from './get_step_definitions';
import { ServerStepRegistry } from '../step_registry';
import type { ServerStepDefinition } from '../step_registry/types';

describe('registerGetStepDefinitionsRoute', () => {
  const router = httpServiceMock.createRouter();
  const logger = loggerMock.create();
  const registry = new ServerStepRegistry(loggerMock.create());

  beforeEach(() => {
    router.get.mockClear();
  });

  it('registers a GET route at the expected path with internal access and authz disabled', () => {
    registerGetStepDefinitionsRoute(router, registry, logger);

    expect(router.get).toHaveBeenCalledTimes(1);
    const [routeConfig] = router.get.mock.calls[0];
    expect(routeConfig.path).toBe('/internal/workflows_extensions/step_definitions');
    expect(routeConfig.options?.access).toBe('internal');
    expect(routeConfig.security?.authz).toHaveProperty('enabled', false);
  });

  it('returns only the ids of the steps, sorted alphabetically, by default', async () => {
    const stepRegistry = new ServerStepRegistry(logger);
    const sharedHandler = async () => ({ output: {} });
    stepRegistry.register({ id: 'z.step', handler: sharedHandler } as any);
    stepRegistry.register({ id: 'a.step', handler: sharedHandler } as any);
    stepRegistry.register({ id: 'm.step', handler: sharedHandler } as any);

    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, stepRegistry, logger);

    const [, handler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    const { body } = response.ok.mock.calls[0][0]!;
    expect(body).toEqual({ steps: [{ id: 'a.step' }, { id: 'm.step' }, { id: 'z.step' }] });
  });

  it('waits for pending async loaders before returning steps', async () => {
    const stepRegistry = new ServerStepRegistry(logger);
    const handler = async () => ({ output: {} });
    stepRegistry.register({ id: 'sync.step', handler } as any);
    stepRegistry.register(
      () =>
        new Promise<ServerStepDefinition>((resolve) => {
          setTimeout(() => resolve({ id: 'async.step', handler } as any), 0);
        })
    );

    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, stepRegistry, logger);

    const [, routeHandler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await routeHandler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    const { steps } = body as { steps: Array<{ id: string }> };
    expect(steps.map(({ id }) => id)).toEqual(['async.step', 'sync.step']);
  });

  it('returns empty steps array when registry is empty', async () => {
    const emptyRegistry = new ServerStepRegistry(logger);
    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, emptyRegistry, logger);

    const [, handler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    expect((body as { steps: unknown[] }).steps).toEqual([]);
  });

  describe('with include_contracts', () => {
    const getSteps = async (stepRegistry: ServerStepRegistry) => {
      const testRouter = httpServiceMock.createRouter();
      registerGetStepDefinitionsRoute(testRouter, stepRegistry, logger);

      const [, handler] = testRouter.get.mock.calls[0];
      const response = httpServerMock.createResponseFactory();
      await handler(
        {} as any,
        httpServerMock.createKibanaRequest({ query: { include_contracts: true } }),
        response
      );

      const { body } = response.ok.mock.calls[0][0]!;
      return (body as { steps: Array<Record<string, unknown>> }).steps;
    };

    beforeEach(() => {
      logger.error.mockClear();
    });

    it('returns the contract of each step', async () => {
      const stepRegistry = new ServerStepRegistry(logger);
      stepRegistry.register({
        id: 'a.step',
        handler: async () => ({ output: {} }),
        inputSchema: z.object({ message: z.string() }),
        outputSchema: z.object({ sent: z.boolean() }),
        stability: 'stable',
      } as any);

      const steps = await getSteps(stepRegistry);

      expect(steps).toEqual([
        {
          id: 'a.step',
          contract: {
            id: 'a.step',
            stability: 'stable',
            exposure: 'open',
            input: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
            output: {
              type: 'object',
              properties: { sent: { type: 'boolean' } },
              required: ['sent'],
              additionalProperties: false,
            },
          },
        },
      ]);
    });

    it('returns the error, and logs it, when a contract cannot be serialized', async () => {
      const stepRegistry = new ServerStepRegistry(logger);
      // A value that isn't a zod schema makes z.toJSONSchema throw even with unrepresentable: 'any'.
      stepRegistry.register({
        id: 'broken.step',
        handler: async () => ({ output: {} }),
        inputSchema: {},
        outputSchema: z.object({}),
      } as any);
      stepRegistry.register({
        id: 'valid.step',
        handler: async () => ({ output: {} }),
        inputSchema: z.object({}),
        outputSchema: z.object({}),
      } as any);

      const steps = await getSteps(stepRegistry);

      expect(steps).toEqual([
        { id: 'broken.step', contractError: expect.any(String) },
        { id: 'valid.step', contract: expect.objectContaining({ id: 'valid.step' }) },
      ]);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
