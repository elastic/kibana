/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from './environment_filter_values';

// Bounds the free-form branch to satisfy the CodeQL "unbounded string in route
// validation" rule (DoS hardening); generous enough not to reject real
// environment names.
const MAX_ENVIRONMENT_LENGTH = 1_024;

export const environmentStringSchema = z.union([
  z.literal(ENVIRONMENT_NOT_DEFINED.value),
  z.literal(ENVIRONMENT_ALL.value),
  z.string().max(MAX_ENVIRONMENT_LENGTH),
]);

export const environmentSchema = z.object({
  environment: environmentStringSchema,
});

export type Environment = z.infer<typeof environmentSchema>['environment'];
