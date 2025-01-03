/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getBannerInfo } from './get_banner_info';

describe('getBannerInfo', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  it('calls `http.get` with the correct parameters', async () => {
    await getBannerInfo(http);

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/api/banners/info');
  });

  it('returns the value from the service', async () => {
    const expected = {
      allowed: true,
    };
    http.get.mockResolvedValue(expected);

    const response = await getBannerInfo(http);

    expect(response).toEqual(expected);
  });
});
