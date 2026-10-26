/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_GROUPING_FIELDS } from '@kbn/alerting-v2-schemas';
import { actionPolicySavedObjectAttributesSchemaV5 } from './v5';

/**
 * v6 folds `groupingMode` and `groupBy` into a single `grouping` block whose mode decides the rest
 * of its keys, so a mode that reads no fields can no longer be stored alongside them. Absent means
 * `per_alert`, which is why the block is not nullable: there is nothing a `null` would say that
 * leaving it out does not.
 *
 * It also relaxes `description`, which the API has always allowed a policy to omit.
 */
export const actionPolicySavedObjectAttributesSchemaV6 =
  actionPolicySavedObjectAttributesSchemaV5.extends({
    description: schema.maybe(schema.string()),
    groupingMode: undefined,
    groupBy: undefined,
    grouping: schema.maybe(
      schema.oneOf([
        schema.object({
          mode: schema.literal('per_field'),
          fields: schema.arrayOf(schema.string(), { minSize: 1, maxSize: MAX_GROUPING_FIELDS }),
        }),
        schema.object({ mode: schema.literal('all') }),
        schema.object({ mode: schema.literal('per_alert') }),
      ])
    ),
  });

export type ActionPolicySavedObjectAttributesV6 = ReturnType<
  typeof actionPolicySavedObjectAttributesSchemaV6.validate
>;
