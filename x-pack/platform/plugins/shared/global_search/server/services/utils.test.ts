/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { getRequestBasePath } from './utils';

describe('getRequestBasePath', () => {
  let basePath: ReturnType<typeof httpServiceMock.createBasePath>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    basePath = httpServiceMock.createBasePath();
    request = httpServerMock.createKibanaRequest();
  });

  it('return a IBasePath prepending the request basePath', () => {
    basePath.get.mockReturnValue('/base-path/s/my-space');
    const requestBasePath = getRequestBasePath(request, basePath);

    const fullPath = requestBasePath.prepend('/app/dashboard/some-id');

    expect(fullPath).toBe('/base-path/s/my-space/app/dashboard/some-id');

    expect(basePath.get).toHaveBeenCalledTimes(1);
    expect(basePath.get).toHaveBeenCalledWith(request);

    expect(basePath.prepend).not.toHaveBeenCalled();
  });
});

httpServiceMock.createBasePath();
