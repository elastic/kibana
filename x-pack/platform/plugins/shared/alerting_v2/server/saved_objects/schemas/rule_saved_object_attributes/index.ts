/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV1 } from './v1';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV2 } from './v2';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV4 } from './v4';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV5 } from './v5';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV6 } from './v6';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV7 } from './v7';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV8 } from './v8';

/** Attributes as stored up to model version 3, where artifacts carried `value: string`. */
export type RuleSavedObjectAttributesV2 = TypeOf<typeof ruleSavedObjectAttributesSchemaV2>;

/**
 * Attributes as stored up to model version 6, where `query` was discriminated
 * on `format` and the lifecycle strategies were top-level scalars.
 */
export type RuleSavedObjectAttributesV4 = TypeOf<typeof ruleSavedObjectAttributesSchemaV4>;

/** Introduced by model version 7. */
export type RuleSavedObjectAttributesV5 = TypeOf<typeof ruleSavedObjectAttributesSchemaV5>;

/** Latest attributes shape, introduced by model version 10. */
export type RuleSavedObjectAttributes = TypeOf<typeof ruleSavedObjectAttributesSchemaV8>;

export {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
  ruleSavedObjectAttributesSchemaV5,
  ruleSavedObjectAttributesSchemaV6,
  ruleSavedObjectAttributesSchemaV7,
  ruleSavedObjectAttributesSchemaV8,
};

/**
 * The current (latest) rule saved-object attributes schema.
 *
 * `fromBuilderManifest` uses this to build the forward-compatibility schema for
 * every fold line. Update this alias whenever a new versioned attributes schema
 * is created, so that all existing and future fold lines pick up the new schema
 * automatically without needing individual call-site updates.
 *
 * Ref: rule-data-migration.md "Rollback behavior"
 */
export const currentRuleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV8;
