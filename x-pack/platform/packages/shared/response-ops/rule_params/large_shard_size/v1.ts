/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const largeShardSizeParamsSchema = stackMonitoringCommonSchema.extends({
  indexPattern: schema.string({}),
});
export type LargeShardSizeParams = TypeOf<typeof largeShardSizeParamsSchema>;
