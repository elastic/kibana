/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV2 } from './v2';

/**
 * v3 moves the artifact payload from a single overloaded `value: string` to a
 * structured `data` record, so each artifact can carry multiple fields.
 *
 * The framework stays agnostic to artifact types — the shape of `data` is a
 * consumer-side convention (e.g. `{ content }` for runbooks,
 * `{ dashboardId }` for dashboards) and is intentionally not enforced here.
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV2.extends({
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
