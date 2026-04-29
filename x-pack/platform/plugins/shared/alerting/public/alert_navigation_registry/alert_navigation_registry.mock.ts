/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AlertNavigationRegistry } from './alert_navigation_registry';

type Schema = PublicMethodsOf<AlertNavigationRegistry>;

const createAlertNavigationRegistryMock = () => {
  const mocked: jest.Mocked<Schema> = {
    has: jest.fn(),
    hasDefaultHandler: jest.fn(),
    hasTypedHandler: jest.fn(),
    register: jest.fn(),
    registerDefault: jest.fn(),
    get: jest.fn(),
  };
  return mocked;
};

export const alertNavigationRegistryMock = {
  create: createAlertNavigationRegistryMock,
};
