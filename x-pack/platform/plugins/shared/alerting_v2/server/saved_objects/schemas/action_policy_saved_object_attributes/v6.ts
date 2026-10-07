/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionPolicySavedObjectAttributesSchemaV5 } from './v5';

export const actionPolicySavedObjectAttributesSchemaV6 =
  actionPolicySavedObjectAttributesSchemaV5.extends({
    description: schema.maybe(schema.string()),
  });

export type ActionPolicySavedObjectAttributesV6 = ReturnType<
  typeof actionPolicySavedObjectAttributesSchemaV6.validate
>;
