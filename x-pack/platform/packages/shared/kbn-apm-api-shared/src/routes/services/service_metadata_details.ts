/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface ServiceMetadataDetails {
  service?: {
    versions?: string[];
    runtime?: {
      name?: string;
      version?: string;
    };
    framework?: string;
    agent: {
      name: string;
      version: string;
    };
  };
  opentelemetry?: {
    language?: string;
    sdkVersion?: string;
    autoVersion?: string;
  };
  container?: {
    ids?: string[];
    image?: string;
    os?: string;
    totalNumberInstances?: number;
  };
  serverless?: {
    type?: string;
    functionNames?: string[];
    faasTriggerTypes?: string[];
    hostArchitecture?: string;
  };
  cloud?: {
    provider?: string;
    availabilityZones?: string[];
    regions?: string[];
    machineTypes?: string[];
    projectName?: string;
    serviceName?: string;
  };
  kubernetes?: {
    deployments?: string[];
    namespaces?: string[];
    replicasets?: string[];
    containerImages?: string[];
  };
}

export const serviceMetadataDetailsRoute = defineRoute<ServiceMetadataDetails>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: rangeSchema.merge(environmentSchema),
  }),
});
