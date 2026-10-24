/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { HttpService } from './http_service';

describe('HttpService', () => {
  const setup = () => {
    const { http } = coreMock.createStart();
    http.fetch.mockResolvedValue({});
    return { http, service: new HttpService(http) };
  };

  it('forwards the abort signal to http.fetch for promise requests', async () => {
    const { http, service } = setup();
    const { signal } = new AbortController();

    await service.http({ path: '/api/ml/test', signal });

    expect(http.fetch).toHaveBeenCalledWith('/api/ml/test', expect.objectContaining({ signal }));
  });

  it('does not set a signal when none is provided', async () => {
    const { http, service } = setup();

    await service.http({ path: '/api/ml/test' });

    expect((http.fetch as unknown as jest.Mock).mock.calls[0][1]).not.toHaveProperty('signal');
  });

  it('aborts the underlying request when the signal aborts for observable requests', () => {
    const { http, service } = setup();
    const controller = new AbortController();
    const fetchMock = http.fetch as unknown as jest.Mock;
    fetchMock.mockImplementation(() => new Promise(() => {}));

    service.http$({ path: '/api/ml/test', signal: controller.signal }).subscribe();
    const fetchSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;

    expect(fetchSignal.aborted).toBe(false);
    controller.abort();
    expect(fetchSignal.aborted).toBe(true);
  });
});
