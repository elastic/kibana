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

/** Attributes as stored up to model version 3, where artifacts carried `value: string`. */
export type RuleSavedObjectAttributesV2 = TypeOf<typeof ruleSavedObjectAttributesSchemaV2>;

/**
 * Attributes as stored up to model version 5, where `query` was discriminated
 * on `format` and the lifecycle strategies were top-level scalars.
 */
export type RuleSavedObjectAttributesV3 = TypeOf<typeof ruleSavedObjectAttributesSchemaV3>;

type RuleSavedObjectAttributesV4 = TypeOf<typeof ruleSavedObjectAttributesSchemaV4>;

/**
 * Latest attributes shape, introduced by model version 6.
 *
 * `recovery` and `no_data` are present exactly when `kind` is `alert`, which the
 * schema enforces through a `kind` sibling ref but `TypeOf` flattens to
 * required, so they are widened back to optional here.
 */
export type RuleSavedObjectAttributes = Omit<RuleSavedObjectAttributesV4, 'recovery' | 'no_data'> &
  Partial<Pick<RuleSavedObjectAttributesV4, 'recovery' | 'no_data'>>;

export {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
};
