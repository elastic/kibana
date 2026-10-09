/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { querySchema as querySchemaV5 } from './v5';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV12 } from './v12';

/**
 * Makes `query` optional on the stored rule.
 *
 * Execution-time builder rules compile their query fresh on every run and never
 * persist one. Only write-time builder rules and plain ES|QL rules carry a
 * stored query.
 *
 * The query shape itself is v5's, imported rather than copied so that a later
 * upstream change to it cannot leave this version behind.
 *
 * Ref: rule-execution-logic.md "A rule without a persisted query"
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV12.extends({
  query: schema.maybe(querySchemaV5),
});
