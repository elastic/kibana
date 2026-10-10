/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  federatedIdentitySourceType,
  s3AuthOptions,
} from '../create_data_source_flyout/auth_options';
import type { DataFedServiceConfig } from './service_registry';

export const getS3ServiceConfig = (enabled: boolean): DataFedServiceConfig => ({
  name: 's3',
  enabled,
  authOptions: (federatedIdentity: boolean) =>
    federatedIdentity ? [federatedIdentitySourceType('s3'), ...s3AuthOptions] : s3AuthOptions,
});
