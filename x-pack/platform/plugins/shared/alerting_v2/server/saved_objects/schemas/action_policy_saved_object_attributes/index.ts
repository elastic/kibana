/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { actionPolicySavedObjectAttributesSchema as actionPolicySavedObjectAttributesSchemaV1 } from './v1';
import { actionPolicySavedObjectAttributesSchema as actionPolicySavedObjectAttributesSchemaV2 } from './v2';
import { actionPolicySavedObjectAttributesSchemaV3 } from './v3';

export type ActionPolicySavedObjectAttributesV1 = TypeOf<
  typeof actionPolicySavedObjectAttributesSchemaV1
>;

export type ActionPolicySavedObjectAttributesV2 = TypeOf<
  typeof actionPolicySavedObjectAttributesSchemaV2
>;

export type ActionPolicySavedObjectAttributes = TypeOf<
  typeof actionPolicySavedObjectAttributesSchemaV3
>;

export {
  actionPolicySavedObjectAttributesSchemaV1,
  actionPolicySavedObjectAttributesSchemaV2,
  actionPolicySavedObjectAttributesSchemaV3,
};
