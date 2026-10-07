/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { KibanaResponseFactory } from '@kbn/core/server';
import type { EntityStoreRequestHandlerContext } from '../../types';
import type { LogsExtractionClient } from '../../domain/logs_extraction';
import type { AssetManagerClient } from '../../domain/asset_manager/asset_manager_client';
import { handleEngineConfig } from './engine_config';

const authorized = {
  hasAllRequested: true,
  username: 'elastic',
  privileges: { kibana: [], elasticsearch: { cluster: [], index: {} } },
};

const unauthorized = {
  hasAllRequested: false,
  username: 'reader',
  privileges: {
    kibana: [],
    elasticsearch: {
      cluster: [],
      index: { 'custom-*': [{ privilege: 'read', authorized: false }] },
    },
  },
};

const createCtx = ({
  updateTypeConfig = jest.fn().mockResolvedValue({
    logExtractionConfig: {},
    nonPriorityLogExtractionConfig: {},
  }),
  getPrivileges = jest.fn().mockResolvedValue(authorized),
  dualProcess = true,
}: {
  updateTypeConfig?: jest.Mock;
  getPrivileges?: jest.Mock;
  dualProcess?: boolean;
} = {}) => ({
  ctx: {
    entityStore: Promise.resolve({
      logger: loggerMock.create(),
      assetManagerClient: { getPrivileges } as unknown as AssetManagerClient,
      logsExtractionClient: { updateTypeConfig } as unknown as LogsExtractionClient,
      isDualProcessEnabled: jest.fn().mockResolvedValue(dualProcess),
    }),
  } as unknown as EntityStoreRequestHandlerContext,
  updateTypeConfig,
  getPrivileges,
});

const createRes = () =>
  ({
    ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
    notFound: jest.fn(({ body }) => ({ status: 404, payload: body })),
    forbidden: jest.fn(({ body }) => ({ status: 403, payload: body })),
    badRequest: jest.fn(({ body }) => ({ status: 400, payload: body })),
  } as unknown as KibanaResponseFactory);

type EngineConfigRequest = Parameters<typeof handleEngineConfig>[1];

const createReq = (body: object, entityType = 'user') =>
  ({ params: { entityType }, body } as unknown as EngineConfigRequest);

describe('handleEngineConfig', () => {
  it('writes both override layers', async () => {
    const { ctx, updateTypeConfig } = createCtx();
    const body = {
      logExtraction: { frequency: '5m' },
      nonPriorityOverride: { samplingRate: 0.5 },
    };

    const result = await handleEngineConfig(ctx, createReq(body), createRes());

    expect(updateTypeConfig).toHaveBeenCalledWith('user', {
      logExtraction: { frequency: '5m' },
      nonPriorityOverride: { samplingRate: 0.5 },
    });
    expect(result).toEqual({
      status: 200,
      payload: { logExtractionConfig: {}, nonPriorityLogExtractionConfig: {} },
    });
  });

  it('passes a single block through untouched, leaving the other undefined', async () => {
    const { ctx, updateTypeConfig } = createCtx();

    await handleEngineConfig(
      ctx,
      createReq({ nonPriorityOverride: { frequency: null } }),
      createRes()
    );

    expect(updateTypeConfig).toHaveBeenCalledWith('user', {
      logExtraction: undefined,
      nonPriorityOverride: { frequency: null },
    });
  });

  it('writes logExtraction with the dual-process flag off', async () => {
    const { ctx, updateTypeConfig } = createCtx({ dualProcess: false });

    const result = await handleEngineConfig(
      ctx,
      createReq({ logExtraction: { frequency: '30m' } }),
      createRes()
    );

    expect(result).toMatchObject({ status: 200 });
    expect(updateTypeConfig).toHaveBeenCalledWith('user', {
      logExtraction: { frequency: '30m' },
      nonPriorityOverride: undefined,
    });
  });

  it('rejects nonPriorityOverride with the dual-process flag off', async () => {
    const { ctx, updateTypeConfig } = createCtx({ dualProcess: false });

    const result = await handleEngineConfig(
      ctx,
      createReq({ nonPriorityOverride: { samplingRate: 0.5 } }),
      createRes()
    );

    expect(result).toEqual({
      status: 400,
      payload: {
        message: 'nonPriorityOverride requires dual-process log extraction to be enabled',
      },
    });
    expect(updateTypeConfig).not.toHaveBeenCalled();
  });

  it('rejects nonPriorityOverride for a type without a non-priority process', async () => {
    const { ctx, updateTypeConfig } = createCtx();

    const result = await handleEngineConfig(
      ctx,
      createReq({ nonPriorityOverride: { samplingRate: 0.5 } }, 'host'),
      createRes()
    );

    expect(result).toMatchObject({ status: 400 });
    expect(updateTypeConfig).not.toHaveBeenCalled();
  });

  it('checks privileges against additionalIndexPatterns from the shared block', async () => {
    const { ctx, getPrivileges } = createCtx();

    await handleEngineConfig(
      ctx,
      createReq({ logExtraction: { additionalIndexPatterns: ['custom-*'] } }),
      createRes()
    );

    expect(getPrivileges).toHaveBeenCalledWith(expect.anything(), ['custom-*']);
  });

  it('returns 403 and does not write when the user lacks index privileges', async () => {
    const { ctx, updateTypeConfig } = createCtx({
      getPrivileges: jest.fn().mockResolvedValue(unauthorized),
    });

    const result = await handleEngineConfig(
      ctx,
      createReq({ logExtraction: { additionalIndexPatterns: ['custom-*'] } }),
      createRes()
    );

    expect(result).toMatchObject({ status: 403 });
    expect(updateTypeConfig).not.toHaveBeenCalled();
  });

  it('returns 404 when no engine is installed for the type', async () => {
    const { ctx } = createCtx({
      updateTypeConfig: jest
        .fn()
        .mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('engine', 'user')),
    });

    const result = await handleEngineConfig(
      ctx,
      createReq({ logExtraction: { frequency: '5m' } }),
      createRes()
    );

    expect(result).toEqual({
      status: 404,
      payload: { message: 'No entity engine installed for entity type user' },
    });
  });
});
