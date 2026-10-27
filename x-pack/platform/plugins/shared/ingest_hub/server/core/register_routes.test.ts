/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';

import { ECF_LATEST_VERSION_API_PATH } from '../../common/providers/aws/ecf_version_api';
import { registerRoutes } from './register_routes';

const { loggerMock } = jest.requireActual('@kbn/logging-mocks');

describe('registerRoutes()', () => {
  it('registers the AWS provider routes', () => {
    const router = httpServiceMock.createRouter();

    registerRoutes(router, loggerMock.create());

    expect(router.get).toHaveBeenCalledTimes(1);
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe(ECF_LATEST_VERSION_API_PATH);
  });
});
