/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const downstreamDependenciesRouteRt = t.intersection([
  t.type({
    serviceName: t.string,
    start: t.string,
    end: t.string,
  }),
  t.partial({
    serviceEnvironment: t.string,
  }),
]);

export interface APMDownstreamDependency {
  'service.name'?: string;
  'span.destination.service.resource': string;
  'span.type'?: string;
  'span.subtype'?: string;
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}
