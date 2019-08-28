/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export type ActionsConfigType = TypeOf<typeof config>;

export type ActionKibanaConfig = TypeOf<typeof actionConfig>;

export const actionConfig = schema.object({
  whitelistedEndpoints: schema.oneOf([schema.arrayOf(schema.string()), schema.literal('any')]),
});

export const config = schema.mapOf(schema.string(), actionConfig);
