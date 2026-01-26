/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';

const creatAlertingAuthorizationClientFactoryMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<AlertingAuthorizationClientFactory>> = {
    create: jest.fn(),
    initialize: jest.fn(),
    createForSpace: jest.fn(),
  };
  return mocked;
};

export const alertingAuthorizationClientFactoryMock = {
  createFactory: creatAlertingAuthorizationClientFactoryMock,
};
