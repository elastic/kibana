/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type TypeOf, schema } from '@kbn/config-schema';

/**
 * Schema for APM indices
 */
export const indicesSchema = schema.object({
  transaction: schema.string({ defaultValue: 'traces-apm*,apm-*,traces-*.otel-*' }), // TODO: remove apm-* pattern in 9.0
  span: schema.string({ defaultValue: 'traces-apm*,apm-*,traces-*.otel-*' }),
  error: schema.string({ defaultValue: 'logs-apm*,apm-*,logs-*.otel-*' }),
  metric: schema.string({ defaultValue: 'metrics-apm*,apm-*,metrics-*.otel-*' }),
  onboarding: schema.string({ defaultValue: 'apm-*' }), // Unused: to be deleted
  sourcemap: schema.string({ defaultValue: 'apm-*' }), // Unused: to be deleted
});

/**
 * Schema for APM Sources configuration
 */
export const configSchema = schema.object({
  indices: indicesSchema,
});

/**
 * Schema for APM Sources configuration
 */
export type APMSourcesAccessConfig = TypeOf<typeof configSchema>;
/**
 * Schema for APM indices
 */
export type APMIndices = APMSourcesAccessConfig['indices'];
