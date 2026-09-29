/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { HttpSetup } from '@kbn/core/public';

vi.mock('../../shared_imports', () => {
  const mocked = {
    sendRequest: vi.fn(),
    useRequest: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { API_BASE_PATH } from '../../../common/constants';
import { ApiService } from './api';

describe('ApiService payload shaping', async () => {
  const sharedImportsMock = (vi.mocked(await import('../../shared_imports'))) as {
    sendRequest: Mock;
    useRequest: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPipeline omits UI-only fields', async () => {
    const api = new ApiService();

    const http = {} as unknown as HttpSetup;
    const uiMetricService = { trackUiMetric: vi.fn() } as any;
    api.setup(http, uiMetricService);

    sharedImportsMock.sendRequest.mockResolvedValue({ data: undefined, error: undefined });

    await api.createPipeline({
      name: 'my_pipeline',
      description: 'desc',
      processors: [],
      on_failure: [],
      _meta: { a: 1 },
      deprecated: true,
      isManaged: true,
    });

    const [, config] = sharedImportsMock.sendRequest.mock.calls[0];
    expect(config).toMatchObject({
      path: API_BASE_PATH,
      method: 'post',
    });

    const body = JSON.parse((config as any).body);
    expect(body).toEqual({
      name: 'my_pipeline',
      description: 'desc',
      processors: [],
      on_failure: [],
      _meta: { a: 1 },
    });
  });

  it('updatePipeline strips name and omits UI-only fields', async () => {
    const api = new ApiService();

    const http = {} as unknown as HttpSetup;
    const uiMetricService = { trackUiMetric: vi.fn() } as any;
    api.setup(http, uiMetricService);

    sharedImportsMock.sendRequest.mockResolvedValue({ data: undefined, error: undefined });

    await api.updatePipeline({
      name: 'my_pipeline',
      description: 'updated',
      processors: [],
      deprecated: true,
      isManaged: true,
    });

    const [, config] = sharedImportsMock.sendRequest.mock.calls[0];
    expect(config).toMatchObject({
      path: `${API_BASE_PATH}/${encodeURIComponent('my_pipeline')}`,
      method: 'put',
    });

    const body = JSON.parse((config as any).body);
    expect(body).toEqual({
      description: 'updated',
      processors: [],
    });
  });
});
