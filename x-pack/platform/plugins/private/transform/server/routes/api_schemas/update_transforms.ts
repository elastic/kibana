/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { TransformPivotConfig } from '../../../common/types/transform';
import { TRANSFORM_PROJECT_ROUTING_MAX_LENGTH } from '../../../common/constants';

import { runtimeMappingsSchema } from './common';
import { retentionPolicySchema, settingsSchema, syncSchema } from './transforms';

// Update requests can send a partial `source`, for example only `project_routing`.
// The route validates the request before the handler can merge it with the existing
// transform source, so this cannot reuse the create/full transform `sourceSchema`.
const sourceUpdateSchema = schema.object({
  runtime_mappings: schema.maybe(runtimeMappingsSchema),
  index: schema.maybe(
    schema.oneOf([
      schema.string({ maxLength: 1000 }),
      schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
    ])
  ),
  query: schema.maybe(schema.recordOf(schema.string({ maxLength: 1000 }), schema.any())),
  project_routing: schema.maybe(schema.string({ maxLength: TRANSFORM_PROJECT_ROUTING_MAX_LENGTH })),
});

// POST _transform/{transform_id}/_update
export const postTransformsUpdateRequestSchema = schema.object({
  description: schema.maybe(schema.string({ maxLength: 1000 })),
  // we cannot reuse `destSchema` because `index` is optional for the update request
  dest: schema.maybe(
    schema.object({
      index: schema.string({ maxLength: 1000 }),
      pipeline: schema.maybe(schema.string({ maxLength: 1000 })),
    })
  ),
  frequency: schema.maybe(schema.string({ maxLength: 64 })),
  // maybe: If not set, any existing `retention_policy` config will not be updated.
  // nullable: If set to `null`, any existing `retention_policy` will be removed.
  retention_policy: schema.maybe(schema.nullable(retentionPolicySchema)),
  settings: schema.maybe(settingsSchema),
  source: schema.maybe(sourceUpdateSchema),
  sync: schema.maybe(syncSchema),
});

export type PostTransformsUpdateRequestSchema = TypeOf<typeof postTransformsUpdateRequestSchema>;
export type PostTransformsUpdateResponseSchema = TransformPivotConfig;
