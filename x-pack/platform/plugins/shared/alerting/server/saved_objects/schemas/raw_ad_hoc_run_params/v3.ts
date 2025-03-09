/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawAdHocRunParamsSchema as rawAdHocRunParamsSchemaV2 } from './v2';

export const rawAdHocRunParamsSchema = rawAdHocRunParamsSchemaV2.extends({
  executionUuid: schema.maybe(schema.string()),
});
