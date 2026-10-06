/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionPolicySavedObjectAttributesSchemaV4 } from './v4';

export const actionPolicySavedObjectAttributesSchemaV5 =
  actionPolicySavedObjectAttributesSchemaV4.extends({
    groupingMode: schema.maybe(
      schema.nullable(
        schema.oneOf([
          schema.literal('per_alert'),
          schema.literal('all'),
          schema.literal('per_field'),
        ])
      )
    ),
  });

export type ActionPolicySavedObjectAttributesV5 = ReturnType<
  typeof actionPolicySavedObjectAttributesSchemaV5.validate
>;
