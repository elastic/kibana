/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const endpointSettingSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: 256 }),
  parameters: schema.maybe(
    schema.object({
      reasoning: schema.maybe(
        schema.object({
          effort: schema.maybe(
            schema.oneOf([
              schema.literal('none'),
              schema.literal('minimal'),
              schema.literal('low'),
              schema.literal('medium'),
              schema.literal('high'),
              schema.literal('xhigh'),
            ])
          ),
        })
      ),
    })
  ),
});

const featureSettingSchema = schema.object({
  feature_id: schema.string({ minLength: 1, maxLength: 256 }),
  endpoints: schema.arrayOf(endpointSettingSchema, { minSize: 0, maxSize: 30 }),
});

export const inferenceSettingsSchemaV2 = schema.object({
  features: schema.arrayOf(featureSettingSchema, { maxSize: 30 }),
});

export const inferenceFeatureEndpointsSchema = schema.object({
  endpoints: schema.arrayOf(endpointSettingSchema, { minSize: 0, maxSize: 30 }),
});

export const featureSettingsFeatureIdSchema = schema.object({
  feature_id: schema.string({ minLength: 1, maxLength: 256 }),
});
