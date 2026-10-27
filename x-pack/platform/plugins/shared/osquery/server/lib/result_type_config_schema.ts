/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RESULT_TYPES } from '../../common/result_type';

const [snapshot, differential, differentialAddedOnly] = RESULT_TYPES;

/** Shared `@kbn/config-schema` codec for {@link RESULT_TYPES}. */
export const resultTypeConfigSchema = schema.oneOf([
  schema.literal(snapshot),
  schema.literal(differential),
  schema.literal(differentialAddedOnly),
]);
