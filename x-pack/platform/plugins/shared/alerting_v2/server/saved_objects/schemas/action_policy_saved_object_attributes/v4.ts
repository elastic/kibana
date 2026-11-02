/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionPolicySavedObjectAttributesSchemaV3 } from './v3';

export const actionPolicySavedObjectAttributesSchemaV4 =
  actionPolicySavedObjectAttributesSchemaV3.extends({
    createdBy: schema.nullable(schema.object({ profile_uid: schema.nullable(schema.string()) })),
    updatedBy: schema.nullable(schema.object({ profile_uid: schema.nullable(schema.string()) })),
  });

export type ActionPolicySavedObjectAttributesV4 = ReturnType<
  typeof actionPolicySavedObjectAttributesSchemaV4.validate
>;
