/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { MAX_FIELD_VALUE_LENGTH } from './request_limits';

export const downstreamDependenciesRouteRt = z.object({
  serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
  start: z.string().max(MAX_FIELD_VALUE_LENGTH),
  end: z.string().max(MAX_FIELD_VALUE_LENGTH),
  serviceEnvironment: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
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
