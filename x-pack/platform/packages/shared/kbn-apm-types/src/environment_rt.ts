/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import { z } from '@kbn/zod/v4';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from './environment_filter_values';

export const environmentStringRt = t.union([
  t.literal(ENVIRONMENT_NOT_DEFINED.value),
  t.literal(ENVIRONMENT_ALL.value),
  t.string,
  nonEmptyStringRt,
]);

export const environmentRt = t.type({
  environment: environmentStringRt,
});

export type Environment = t.TypeOf<typeof environmentRt>['environment'];

/**
 * zod equivalents of the io-ts codecs above. Additive - see the comment in
 * `@kbn/apm-api-shared`'s `default_api_types.ts` for why these can't replace
 * the io-ts exports until every still-io-ts consumer of `environmentRt` has
 * migrated (elastic/kibana#243355).
 */

// Bounds the free-form branch to satisfy the CodeQL "unbounded string in route
// validation" rule (DoS hardening); generous enough not to reject real
// environment names.
const MAX_ENVIRONMENT_LENGTH = 1_024;

// nonEmptyStringRt omitted: unreachable in the io-ts union too (t.string matches first).
export const environmentStringSchema = z.union([
  z.literal(ENVIRONMENT_NOT_DEFINED.value),
  z.literal(ENVIRONMENT_ALL.value),
  z.string().max(MAX_ENVIRONMENT_LENGTH),
]);

export const environmentSchema = z.object({
  environment: environmentStringSchema,
});
