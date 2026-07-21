/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Agent, Service, Container, Kubernetes, Host, Cloud } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface ServiceInstanceMetadataDetailsResponse {
  '@timestamp': string;
  agent?: Agent;
  service?: Service;
  container?: Container;
  kubernetes?: Kubernetes;
  host?: Host;
  cloud?: Cloud;
}

export type ServiceInstanceContainerMetadataDetails =
  | {
      kubernetes: Kubernetes;
    }
  | undefined;

export type ServiceInstancesMetadataDetailsRouteResponse = ServiceInstanceMetadataDetailsResponse &
  (ServiceInstanceContainerMetadataDetails | {});

export const serviceInstancesMetadataDetailsRoute =
  defineRoute<ServiceInstancesMetadataDetailsRouteResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
    params: z.object({
      path: z.object({
        serviceName: z.string(),
        serviceNodeName: z.string(),
      }),
      query: rangeSchema,
    }),
  });
