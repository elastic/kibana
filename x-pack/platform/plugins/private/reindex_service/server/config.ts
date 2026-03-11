/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const reindexServiceSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  rollupsEnabled: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor<ReindexConfig> = {
  schema: reindexServiceSchema,
};

export type ReindexConfig = TypeOf<typeof reindexServiceSchema>;
