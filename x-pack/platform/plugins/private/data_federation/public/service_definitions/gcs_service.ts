/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { federatedIdentityAuthOption, gcsAuthOptions } from './auth_options';
import type { DataFedServiceConfig } from '../service_registry';

export const getGcsServiceConfig = (enabled: boolean): DataFedServiceConfig => ({
  name: 'gcs',
  enabled,
  authOptions: (federatedIdentity: boolean) =>
    federatedIdentity ? [federatedIdentityAuthOption('gcs'), ...gcsAuthOptions] : gcsAuthOptions,
});
