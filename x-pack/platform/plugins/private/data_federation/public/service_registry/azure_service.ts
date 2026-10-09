/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  azureAuthOptions,
  federatedIdentitySourceType,
} from '../create_data_source_flyout/auth_options';
import type { DataFedServiceConfig } from './service_registry';

export const getAzureServiceConfig = (enabled: boolean): DataFedServiceConfig => ({
  name: 'azure',
  enabled,
  authOptions: (federatedIdentity: boolean) =>
    federatedIdentity
      ? [federatedIdentitySourceType('azure'), ...azureAuthOptions]
      : azureAuthOptions,
});
