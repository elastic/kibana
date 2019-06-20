/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from './alerts_client';

type Schema = PublicMethodsOf<AlertsClient>;

const createAlertsClientMock = () => {
  const mocked: jest.Mocked<Schema> = {
    create: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  return mocked;
};

export const alertsClientMock = {
  create: createAlertsClientMock,
};
