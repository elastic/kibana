/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV3.extends({
  createdBy: schema.nullable(schema.object({ profile_uid: schema.nullable(schema.string()) })),
  updatedBy: schema.nullable(schema.object({ profile_uid: schema.nullable(schema.string()) })),
});
