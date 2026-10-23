/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceRegistry } from '.';
import { getS3ServiceConfig } from '../service_definitions/s3_service';
import { getGcsServiceConfig } from '../service_definitions/gcs_service';
import { getAzureServiceConfig } from '../service_definitions/azure_service';

export const createServiceRegistry = ({
  enableGoogleCloudStorageDataSourceType = false,
  enableAzureDataSourceType = false,
}: {
  enableGoogleCloudStorageDataSourceType?: boolean;
  enableAzureDataSourceType?: boolean;
} = {}): ServiceRegistry => {
  const serviceRegistry = new ServiceRegistry();
  serviceRegistry.register(getS3ServiceConfig(true));
  serviceRegistry.register(getGcsServiceConfig(enableGoogleCloudStorageDataSourceType));
  serviceRegistry.register(getAzureServiceConfig(enableAzureDataSourceType));
  return serviceRegistry;
};
