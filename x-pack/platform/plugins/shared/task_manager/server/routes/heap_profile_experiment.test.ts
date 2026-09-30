/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { heapProfileExperimentRoutes } from './heap_profile_experiment';
import { mockHandlerArguments } from './_mock_handler_arguments';

describe('heapProfileExperimentRoutes', () => {
  it('registers light and heavy public routes', () => {
    const router = httpServiceMock.createRouter();
    heapProfileExperimentRoutes({ router });

    expect(router.get).toHaveBeenCalledTimes(2);
    expect(router.get.mock.calls[0][0].path).toBe(
      '/api/task_manager/_heap_profile_experiment/light'
    );
    expect(router.get.mock.calls[1][0].path).toBe(
      '/api/task_manager/_heap_profile_experiment/heavy'
    );
    expect(router.get.mock.calls[0][0].options?.access).toBe('public');
    expect(router.get.mock.calls[0][0].security?.authz).toEqual(
      expect.objectContaining({ enabled: false })
    );
  });

  it('allocates and responds on the light route', async () => {
    const router = httpServiceMock.createRouter();
    heapProfileExperimentRoutes({ router });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { query: { latency: 0, bytes: 64 } }, [
      'ok',
    ]);

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        route: '/api/task_manager/_heap_profile_experiment/light',
        latency: 0,
        bytes: 64,
        elapsedMs: expect.any(Number),
      }),
    });
  });

  it('allocates and responds on the heavy route with small values', async () => {
    const router = httpServiceMock.createRouter();
    heapProfileExperimentRoutes({ router });
    const [, handler] = router.get.mock.calls[1];
    const [context, req, res] = mockHandlerArguments({}, { query: { latency: 0, bytes: 128 } }, [
      'ok',
    ]);

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        route: '/api/task_manager/_heap_profile_experiment/heavy',
        latency: 0,
        bytes: 128,
        elapsedMs: expect.any(Number),
      }),
    });
  });
});
