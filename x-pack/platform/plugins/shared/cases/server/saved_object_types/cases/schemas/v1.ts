/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const UserSchema = schema.object({
  email: schema.nullable(schema.string()),
  full_name: schema.nullable(schema.string()),
  username: schema.nullable(schema.string()),
  profile_uid: schema.nullable(schema.string()),
});

const UserProfileSchema = schema.object({ uid: schema.string() });

const ConnectorSchema = schema.object({
  name: schema.string(),
  type: schema.string(),
  fields: schema.arrayOf(schema.object({ key: schema.string(), value: schema.string() })),
});

const ExternalServiceSchema = schema.object({
  connector_name: schema.string(),
  external_id: schema.string(),
  external_title: schema.string(),
  external_url: schema.string(),
  pushed_at: schema.string(),
  pushed_by: UserSchema,
});

const SettingsSchema = schema.object({ syncAlerts: schema.boolean() });

const CustomFieldsSchema = schema.arrayOf(
  schema.object({
    key: schema.string(),
    type: schema.string(),
    value: schema.nullable(schema.any()),
  })
);

export const casesSchema = schema.object({
  assignees: schema.arrayOf(UserProfileSchema),
  category: schema.maybe(schema.nullable(schema.string())),
  closed_at: schema.nullable(schema.string()),
  closed_by: schema.nullable(UserSchema),
  created_at: schema.string(),
  created_by: UserSchema,
  connector: ConnectorSchema,
  customFields: schema.maybe(schema.nullable(CustomFieldsSchema)),
  description: schema.string(),
  duration: schema.nullable(schema.number()),
  external_service: schema.nullable(ExternalServiceSchema),
  owner: schema.string(),
  settings: SettingsSchema,
  severity: schema.oneOf([
    schema.literal(10),
    schema.literal(20),
    schema.literal(30),
    schema.literal(40),
  ]),
  status: schema.oneOf([schema.literal(0), schema.literal(10), schema.literal(20)]),
  tags: schema.arrayOf(schema.string()),
  title: schema.string(),
  total_alerts: schema.number(),
  total_comments: schema.number(),
  updated_at: schema.nullable(schema.string()),
  updated_by: schema.nullable(UserSchema),
});
