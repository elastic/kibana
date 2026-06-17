/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf, schema } from '@kbn/config-schema';

// APM settings store comma-separated index-pattern expressions, so keep their bound
// aligned with Kibana's broader index-pattern (index_management) `maxLength` adoption.
export const APM_INDEX_PATTERN_MAX_LENGTH = 1000;

/**
 * Schema for APM indices
 */
export const indicesSchema = schema.object({
  transaction: schema.string({
    defaultValue: 'traces-apm*,apm-*,traces-*.otel-*',
    maxLength: APM_INDEX_PATTERN_MAX_LENGTH,
  }), // TODO: remove apm-* pattern in 9.0
  span: schema.string({
    defaultValue: 'traces-apm*,apm-*,traces-*.otel-*',
    maxLength: APM_INDEX_PATTERN_MAX_LENGTH,
  }),
  error: schema.string({
    defaultValue: 'logs-apm*,apm-*,logs-*.otel-*',
    maxLength: APM_INDEX_PATTERN_MAX_LENGTH,
  }),
  metric: schema.string({
    defaultValue: 'metrics-apm*,apm-*,metrics-*.otel-*',
    maxLength: APM_INDEX_PATTERN_MAX_LENGTH,
  }),
  onboarding: schema.string({ defaultValue: 'apm-*', maxLength: APM_INDEX_PATTERN_MAX_LENGTH }), // Unused: to be deleted
  sourcemap: schema.string({ defaultValue: 'apm-*', maxLength: APM_INDEX_PATTERN_MAX_LENGTH }), // Unused: to be deleted
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
