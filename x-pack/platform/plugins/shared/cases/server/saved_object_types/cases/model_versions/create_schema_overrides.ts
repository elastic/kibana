/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_FIELDS_PER_CASE } from '../../../../common/constants';

/**
 * Create-schema relaxations shared across model versions >= 9. Each model
 * version's `create` schema is standalone, so these must be re-applied on every
 * new version to avoid regressing what earlier versions already accept.
 */
export const createSchemaOverrides = {
  connector: schema.object({
    name: schema.string(),
    type: schema.string(),
    fields: schema.nullable(
      schema.arrayOf(
        schema.object({
          key: schema.string(),
          value: schema.nullable(schema.any()),
        }),
        { maxSize: MAX_CONNECTOR_FIELDS_PER_CASE }
      )
    ),
  }),
  // NOTE: this aligns the SO schema with persisted severity here
  // x-pack/platform/plugins/shared/cases/server/common/types/case.ts
  severity: schema.oneOf([
    schema.literal(0),
    schema.literal(10),
    schema.literal(20),
    schema.literal(30),
    // NOTE: this is required for legacy reasons
    schema.literal(40),
  ]),
};
