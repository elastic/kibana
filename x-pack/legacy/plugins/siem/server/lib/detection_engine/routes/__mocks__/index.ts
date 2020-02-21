/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

export { clientsServiceMock } from './clients_service_mock';

export const createMockServer = () => {
  const server = new Hapi.Server({ port: 0 });

  return {
    route: server.route.bind(server),
    inject: server.inject.bind(server),
  };
};

export const createMockConfig = () => () => ({
  get: jest.fn(),
  has: jest.fn(),
});
