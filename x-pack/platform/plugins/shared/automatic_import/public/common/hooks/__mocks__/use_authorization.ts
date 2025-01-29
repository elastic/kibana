/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Authorization, RoutesAuthorization } from '../use_authorization';

export const useAuthorization = jest.fn(
  (): Authorization => ({
    canCreateIntegrations: true,
    canExecuteConnectors: true,
    canCreateConnectors: true,
  })
);

export const useRoutesAuthorization = jest.fn(
  (): RoutesAuthorization => ({
    canUseAutomaticImport: true,
    canUseIntegrationUpload: true,
  })
);
