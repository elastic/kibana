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
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV9 } from './v9';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV10 } from './v10';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV11 } from './v11';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV12 } from './v12';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV13 } from './v13';

/** Attributes as stored up to model version 3, where artifacts carried `value: string`. */
export type RuleSavedObjectAttributesV2 = TypeOf<typeof ruleSavedObjectAttributesSchemaV2>;

/**
 * Attributes as stored up to model version 6, where `query` was discriminated
 * on `format` and the lifecycle strategies were top-level scalars.
 */
export type RuleSavedObjectAttributesV4 = TypeOf<typeof ruleSavedObjectAttributesSchemaV4>;

/** Introduced by model version 7. */
export type RuleSavedObjectAttributesV5 = TypeOf<typeof ruleSavedObjectAttributesSchemaV5>;

/** Latest attributes shape. */
export type RuleSavedObjectAttributes = TypeOf<typeof ruleSavedObjectAttributesSchemaV13>;

export {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
  ruleSavedObjectAttributesSchemaV5,
  ruleSavedObjectAttributesSchemaV6,
  ruleSavedObjectAttributesSchemaV7,
  ruleSavedObjectAttributesSchemaV8,
  ruleSavedObjectAttributesSchemaV9,
  ruleSavedObjectAttributesSchemaV10,
  ruleSavedObjectAttributesSchemaV11,
  ruleSavedObjectAttributesSchemaV12,
  ruleSavedObjectAttributesSchemaV13,
};

/**
 * The current (latest) rule saved-object attributes schema, used by
 * `assertBuilderFieldsIsOpenRecord` in `from_builder_fields_manifest.ts`.
 *
 * Do NOT use this alias as the schema argument to `fromBuilderFieldsManifest`.
 * Each fold line in `rule_model_versions.ts` must name a frozen schema version
 * explicitly (e.g. `ruleSavedObjectAttributesSchemaV11`). Re-pointing this alias
 * when a new versioned schema is added would change the schema hash CI records for
 * every already-published fold line, causing `validateAllMappingsInModelVersion`
 * to run against an open record that names no leaf, which fails on the first
 * sub-field.
 *
 * Ref: builder-type-registration-redesign.md "The schemas a folded version carries"
 * Ref: rule-data-migration.md "Rollback behavior"
 */
export const currentRuleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV13;
