/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV1 } from './v1';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV2 } from './v2';

/** Attributes as stored by model versions 1 and 2 (artifacts carried `value: string`). */
export type RuleSavedObjectAttributesV1 = TypeOf<typeof ruleSavedObjectAttributesSchemaV1>;

/** Latest attributes shape, introduced by model version 3. */
export type RuleSavedObjectAttributes = TypeOf<typeof ruleSavedObjectAttributesSchemaV2>;

export { ruleSavedObjectAttributesSchemaV1, ruleSavedObjectAttributesSchemaV2 };
