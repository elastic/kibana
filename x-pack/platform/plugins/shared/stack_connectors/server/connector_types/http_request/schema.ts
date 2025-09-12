/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  url: schema.string(),
  method: schema.oneOf([
    schema.literal('get'),
    schema.literal('put'),
    schema.literal('post'),
    schema.literal('delete'),
    schema.literal('patch'),
  ]),
  contentType: schema.oneOf([
    schema.literal('json'),
    schema.literal('xml'),
    schema.literal('form'),
    schema.literal('data'),
    schema.literal('custom'),
  ]),
  customContentType: schema.maybe(schema.string()),
});
export type HttpRequestConfig = TypeOf<typeof configSchema>;

export const secretsSchema = schema.object({});
export type HttpRequestSecrets = TypeOf<typeof secretsSchema>;

export const paramsSchema = schema.object({
  body: schema.maybe(schema.string()),
});
export type HttpRequestParams = TypeOf<typeof paramsSchema>;
