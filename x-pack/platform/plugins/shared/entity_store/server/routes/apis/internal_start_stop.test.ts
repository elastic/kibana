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
      }),
    } as unknown as EntityStoreRequestHandlerContext,
    assetManager,
    maintainers,
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

    // An omitted list must not expand to types the process cannot run on, or the request that
    // documents itself as "all eligible engines" would always be a 400.
    it('defaults to the gated types when no entity types are given', async () => {
      const { ctx, assetManager } = createCtx([engine({})]);

      const result = await handleInternalStop(
        ctx,
        createReq({ process: 'nonPriority' }),
        createRes()
      );

      expect(assetManager.stopProcess).toHaveBeenCalledWith('user', 'nonPriority');
      expect(result).toEqual({ status: 200, payload: { ok: true, stopped: ['user'] } });
    });

    it('stops a type whose priority process is already stopped when process is both', async () => {
      const { ctx, assetManager } = createCtx([engine({ status: ENGINE_STATUS.STOPPED })]);

      const result = await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['user'], process: 'both' }),
        createRes()
      );

      expect(assetManager.stop).toHaveBeenCalledWith('user');
      expect(result).toEqual({ status: 200, payload: { ok: true, stopped: ['user'] } });
    });

    // stopProcess writes ERROR when task removal failed, so the task may still be scheduled.
    // Skipping ERROR would make the retry report success without touching anything.
    it('retries a process left in error by a failed stop', async () => {
      const { ctx, assetManager } = createCtx([engine({ nonPriorityStatus: ENGINE_STATUS.ERROR })]);

      const result = await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['user'], process: 'nonPriority' }),
        createRes()
      );

      expect(assetManager.stopProcess).toHaveBeenCalledWith('user', 'nonPriority');
      expect(result).toEqual({ status: 200, payload: { ok: true, stopped: ['user'] } });
    });

    it('stops the maintainers once no engine is left started', async () => {
      const { ctx, maintainers, assetManager } = createCtx([engine({})]);
      assetManager.getStatus
        .mockResolvedValueOnce({ engines: [engine({})] })
        .mockResolvedValueOnce({
          engines: [
            engine({ status: ENGINE_STATUS.STOPPED, nonPriorityStatus: ENGINE_STATUS.STOPPED }),
          ],
        });

      await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['user'], process: 'both' }),
        createRes()
      );

      expect(maintainers.stopAll).toHaveBeenCalled();
    });

    // Stopping `host` must not tear the maintainers down while `user` is still extracting
    // through a non-priority process the single-process route left started.
    it('keeps the maintainers up while a non-priority process is still started', async () => {
      const { ctx, maintainers, assetManager } = createCtx([
        engine({ type: 'host', nonPriorityStatus: undefined }),
      ]);
      assetManager.getStatus
        .mockResolvedValueOnce({
          engines: [engine({ type: 'host', nonPriorityStatus: undefined })],
        })
        .mockResolvedValueOnce({
          engines: [
            engine({ type: 'host', status: ENGINE_STATUS.STOPPED, nonPriorityStatus: undefined }),
            engine({ status: ENGINE_STATUS.STOPPED, nonPriorityStatus: ENGINE_STATUS.STARTED }),
          ],
        });

      await handleInternalStop(
        ctx,
        createReq({ entityTypes: ['host'], process: 'both' }),
        createRes()
      );

      expect(maintainers.stopAll).not.toHaveBeenCalled();
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

    it('retries a process left in error by a failed start when process is both', async () => {
      const { ctx, assetManager } = createCtx([engine({ nonPriorityStatus: ENGINE_STATUS.ERROR })]);

      const result = await handleInternalStart(
        ctx,
        createReq({ entityTypes: ['user'], process: 'both' }),
        createRes()
      );

      expect(assetManager.start).toHaveBeenCalledWith(expect.anything(), 'user');
      expect(result).toEqual({ status: 200, payload: { ok: true, started: ['user'] } });
    });

    // `host` never has nonPriorityStatus written, so an unset field must not look like a
    // process that needs starting.
    it('leaves a running ungated type alone when process is both', async () => {
      const { ctx, assetManager } = createCtx([
        engine({ type: 'host', nonPriorityStatus: undefined }),
      ]);

      const result = await handleInternalStart(
        ctx,
        createReq({ entityTypes: ['host'], process: 'both' }),
        createRes()
      );

      expect(assetManager.start).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true, started: [] } });
    });

    it('starts a type whose non-priority process alone is stopped when process is both', async () => {
      const { ctx, assetManager, maintainers } = createCtx([
        engine({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
      ]);

      const result = await handleInternalStart(
        ctx,
        createReq({ entityTypes: ['user'], process: 'both' }),
        createRes()
      );

      expect(assetManager.start).toHaveBeenCalledWith(expect.anything(), 'user');
      expect(maintainers.startAll).toHaveBeenCalled();
      expect(result).toEqual({ status: 200, payload: { ok: true, started: ['user'] } });
    });
  });
});
