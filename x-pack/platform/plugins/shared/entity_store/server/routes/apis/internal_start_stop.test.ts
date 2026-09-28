/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaResponseFactory } from '@kbn/core/server';
import type { EntityStoreRequestHandlerContext } from '../../types';
import type { AssetManagerClient } from '../../domain/asset_manager/asset_manager_client';
import type { EngineDescriptor } from '../../domain/saved_objects';
import { ENGINE_STATUS } from '../../domain/constants';
import { handleInternalStart, handleInternalStop } from './internal_start_stop';

const engine = (overrides: Partial<EngineDescriptor>): EngineDescriptor =>
  ({
    type: 'user',
    status: ENGINE_STATUS.STARTED,
    nonPriorityStatus: ENGINE_STATUS.STARTED,
    ...overrides,
  } as EngineDescriptor);

const createCtx = (engines: EngineDescriptor[]) => {
  const assetManager = {
    getStatus: jest.fn().mockResolvedValue({ engines }),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    startProcess: jest.fn().mockResolvedValue(undefined),
    stopProcess: jest.fn().mockResolvedValue(undefined),
  };

  return {
    ctx: {
      entityStore: Promise.resolve({
        logger: loggerMock.create(),
        assetManagerClient: assetManager as unknown as AssetManagerClient,
      }),
    } as unknown as EntityStoreRequestHandlerContext,
    assetManager,
  };
};

const createRes = () =>
  ({
    ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
    badRequest: jest.fn(({ body }) => ({ status: 400, payload: body })),
  } as unknown as KibanaResponseFactory);

type StartStopRequest = Parameters<typeof handleInternalStart>[1];

const createReq = (body: object) => ({ body } as unknown as StartStopRequest);

describe('internal start/stop', () => {
  describe('handleInternalStop', () => {
    it('stops only the non-priority task and leaves the priority one alone', async () => {
      const { ctx, assetManager } = createCtx([engine({})]);

      const result = await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['user'], process: 'nonPriority' }),
        createRes()
      );

      expect(assetManager.stopProcess).toHaveBeenCalledWith('user', 'nonPriority');
      expect(assetManager.stop).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true, stopped: ['user'] } });
    });

    it('delegates to the paired stop when process is both', async () => {
      const { ctx, assetManager } = createCtx([engine({})]);

      await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['user'], process: 'both' }),
        createRes()
      );

      expect(assetManager.stop).toHaveBeenCalledWith('user');
      expect(assetManager.stopProcess).not.toHaveBeenCalled();
    });

    it('skips a process that is already stopped', async () => {
      const { ctx, assetManager } = createCtx([
        engine({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
      ]);

      const result = await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['user'], process: 'nonPriority' }),
        createRes()
      );

      expect(assetManager.stopProcess).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true, stopped: [] } });
    });

    it('rejects a non-priority request for a type without a priority gate', async () => {
      const { ctx, assetManager } = createCtx([engine({ type: 'generic' })]);

      const result = await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['generic'], process: 'nonPriority' }),
        createRes()
      );

      expect(result).toMatchObject({ status: 400 });
      expect(assetManager.stopProcess).not.toHaveBeenCalled();
    });
  });

  describe('handleInternalStart', () => {
    it('starts only the non-priority task', async () => {
      const { ctx, assetManager } = createCtx([
        engine({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
      ]);

      const result = await handleInternalStart(
        ctx,
        createReq({ entityTypes: ['user'], process: 'nonPriority' }),
        createRes()
      );

      expect(assetManager.startProcess).toHaveBeenCalledWith(
        expect.anything(),
        'user',
        'nonPriority'
      );
      expect(assetManager.start).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true, started: ['user'] } });
    });

    it('starts the priority task off the shared status field', async () => {
      const { ctx, assetManager } = createCtx([engine({ status: ENGINE_STATUS.STOPPED })]);

      await handleInternalStart(
        ctx,
        createReq({ entityTypes: ['user'], process: 'priority' }),
        createRes()
      );

      expect(assetManager.startProcess).toHaveBeenCalledWith(expect.anything(), 'user', 'priority');
    });

    it('skips types that have no engine installed', async () => {
      const { ctx, assetManager } = createCtx([]);

      const result = await handleInternalStart(
        ctx,
        createReq({ entityTypes: ['user'], process: 'nonPriority' }),
        createRes()
      );

      expect(assetManager.startProcess).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true, started: [] } });
    });
  });
});
