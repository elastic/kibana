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
import { handleStart } from './start';
import { handleStop } from './stop';

const engine = (overrides: Partial<EngineDescriptor>): EngineDescriptor =>
  ({
    type: 'user',
    status: ENGINE_STATUS.STARTED,
    nonPriorityStatus: ENGINE_STATUS.STARTED,
    ...overrides,
  } as EngineDescriptor);

const createCtx = (
  engines: EngineDescriptor[],
  {
    remaining = [],
    dualProcess = true,
  }: { remaining?: EngineDescriptor[]; dualProcess?: boolean } = {}
) => {
  const assetManager = {
    getStatus: jest
      .fn()
      .mockResolvedValueOnce({ engines })
      .mockResolvedValue({ engines: remaining }),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  const maintainers = {
    startAll: jest.fn().mockResolvedValue(undefined),
    stopAll: jest.fn().mockResolvedValue(undefined),
  };

  return {
    ctx: {
      entityStore: Promise.resolve({
        logger: loggerMock.create(),
        assetManagerClient: assetManager as unknown as AssetManagerClient,
        entityMaintainersClient: maintainers,
        isDualProcessEnabled: jest.fn().mockResolvedValue(dualProcess),
      }),
    } as unknown as EntityStoreRequestHandlerContext,
    assetManager,
    maintainers,
  };
};

const createRes = () =>
  ({
    ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
  } as unknown as KibanaResponseFactory);

type StartRequest = Parameters<typeof handleStart>[1];

const createReq = (entityTypes: string[]) => ({ body: { entityTypes } } as unknown as StartRequest);

describe('public start/stop', () => {
  describe('handleStart', () => {
    // The internal route can stop one process on its own, so the shared status stays STARTED
    // while the type is only half running. `start` schedules both tasks, so it has to run.
    it('starts a type whose non-priority process alone is stopped', async () => {
      const { ctx, assetManager, maintainers } = createCtx([
        engine({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
      ]);

      const result = await handleStart(ctx, createReq(['user']), createRes());

      expect(assetManager.start).toHaveBeenCalledWith(expect.anything(), 'user');
      expect(maintainers.startAll).toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true } });
    });

    it('leaves a fully running type alone', async () => {
      const { ctx, assetManager, maintainers } = createCtx([engine({})]);

      await handleStart(ctx, createReq(['user']), createRes());

      expect(assetManager.start).not.toHaveBeenCalled();
      expect(maintainers.startAll).not.toHaveBeenCalled();
    });

    // `host` never has nonPriorityStatus written, so reading it must not make it look stopped.
    it('leaves a running ungated type alone', async () => {
      const { ctx, assetManager } = createCtx([
        engine({ type: 'host', nonPriorityStatus: undefined }),
      ]);

      await handleStart(ctx, createReq(['host']), createRes());

      expect(assetManager.start).not.toHaveBeenCalled();
    });

    // With the flag off `start()` writes `nonPriorityStatus: STOPPED` on a healthy gated engine,
    // so counting that field would make every call restart a running store.
    it('ignores nonPriorityStatus with the dual-process flag off', async () => {
      const { ctx, assetManager, maintainers } = createCtx(
        [engine({ nonPriorityStatus: ENGINE_STATUS.STOPPED })],
        { dualProcess: false }
      );

      await handleStart(ctx, createReq(['user']), createRes());

      expect(assetManager.start).not.toHaveBeenCalled();
      expect(maintainers.startAll).not.toHaveBeenCalled();
    });
  });

  describe('handleStop', () => {
    // Stopping priority alone through the internal route leaves the shared status STOPPED while
    // non-priority keeps extracting. Without this the public stop reports success and does nothing.
    it('stops a type whose priority process alone is stopped', async () => {
      const { ctx, assetManager, maintainers } = createCtx([
        engine({ status: ENGINE_STATUS.STOPPED }),
      ]);

      const result = await handleStop(ctx, createReq(['user']), createRes());

      expect(assetManager.stop).toHaveBeenCalledWith('user');
      expect(maintainers.stopAll).toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true } });
    });

    it('leaves a fully stopped type alone', async () => {
      const { ctx, assetManager, maintainers } = createCtx([
        engine({ status: ENGINE_STATUS.STOPPED, nonPriorityStatus: ENGINE_STATUS.STOPPED }),
      ]);

      await handleStop(ctx, createReq(['user']), createRes());

      expect(assetManager.stop).not.toHaveBeenCalled();
      expect(maintainers.stopAll).not.toHaveBeenCalled();
    });

    // The maintainers stay up while any process is still extracting, not just a priority one.
    it('keeps the maintainers running while another type still has a process started', async () => {
      const { ctx, maintainers } = createCtx(
        [engine({}), engine({ type: 'host', nonPriorityStatus: undefined })],
        {
          remaining: [
            engine({ status: ENGINE_STATUS.STOPPED, nonPriorityStatus: ENGINE_STATUS.STARTED }),
            engine({
              type: 'host',
              status: ENGINE_STATUS.STOPPED,
              nonPriorityStatus: undefined,
            }),
          ],
        }
      );

      await handleStop(ctx, createReq(['user', 'host']), createRes());

      expect(maintainers.stopAll).not.toHaveBeenCalled();
    });
  });
});
