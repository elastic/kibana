/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

export const downstreamDependenciesRouteRt = z.object({
  serviceName: z.string(),
  start: z.string(),
  end: z.string(),
  serviceEnvironment: z.string().optional(),
});

export interface APMDownstreamDependency {
  'service.name'?: string;
  'span.destination.service.resource': string;
  'span.type'?: string;
  'span.subtype'?: string;
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}
