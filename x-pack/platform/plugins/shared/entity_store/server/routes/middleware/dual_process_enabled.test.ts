/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { EntityStoreRequestHandlerContext } from '../../types';
import { dualProcessEnabledMiddleware } from './dual_process_enabled';

describe('dualProcessEnabledMiddleware', () => {
  const createCtx = (enabled: boolean) =>
    ({
      entityStore: Promise.resolve({
        logger: loggerMock.create(),
        isDualProcessEnabled: jest.fn().mockResolvedValue(enabled),
      }),
    } as unknown as EntityStoreRequestHandlerContext);

  const createRes = () =>
    ({
      notFound: jest.fn(({ body }) => ({ status: 404, payload: body })),
    } as unknown as KibanaResponseFactory);

  const req = {} as KibanaRequest;

  it('passes through when the dual-process flag is on', async () => {
    const res = createRes();

    await expect(dualProcessEnabledMiddleware(createCtx(true), req, res)).resolves.toBeUndefined();
    expect(res.notFound).not.toHaveBeenCalled();
  });

  it('returns 404 when the dual-process flag is off', async () => {
    const res = createRes();

    const result = await dualProcessEnabledMiddleware(createCtx(false), req, res);

    expect(result).toEqual({
      status: 404,
      payload: { message: 'Dual-process log extraction is not enabled' },
    });
  });
});
