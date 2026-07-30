/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV1 } from './v1';

/**
 * Second revision of the rule attributes schema, introduced by model version 3
 * (`v1` covers model versions 1 and 2, which shared a single shape). The
 * artifact payload moved from a single overloaded `value: string` to a
 * structured `data` record, so each artifact can carry multiple fields.
 *
 * The framework stays agnostic to artifact types — the shape of `data` is a
 * consumer-side convention (e.g. `{ content }` for runbooks,
 * `{ dashboardId }` for dashboards) and is intentionally not enforced here.
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV1.extends({
  artifacts: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
        type: schema.string(),
        data: schema.recordOf(schema.string(), schema.any()),
      }),
      { maxSize: 100 }
    )
  ),
});
