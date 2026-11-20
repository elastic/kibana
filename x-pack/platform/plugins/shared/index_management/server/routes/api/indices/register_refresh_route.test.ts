/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestMock } from '../../../test/helpers';
import { routeDependencies, RouterMock } from '../../../test/helpers';
import { addBasePath } from '..';
import { registerRefreshRoute } from './register_refresh_route';

describe('[Index management API Routes] refresh indices', () => {
  const router = new RouterMock();

  const refreshIndices = router.getMockESApiFn('indices.refresh');

  const mockRequest = (indices: string[]): RequestMock => ({
    method: 'post',
    path: addBasePath('/indices/refresh'),
    body: { indices },
  });

  beforeAll(() => {
    registerRefreshRoute({ ...routeDependencies, router });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes the requested indices with a single request', async () => {
    await expect(router.runRequest(mockRequest(['my_index', 'my_other_index']))).resolves.toEqual({
      status: 200,
      options: {},
    });

    expect(refreshIndices).toHaveBeenCalledTimes(1);
    expect(refreshIndices).toHaveBeenCalledWith({
      expand_wildcards: 'none',
      format: 'json',
      index: ['my_index', 'my_other_index'],
    });
  });
});
