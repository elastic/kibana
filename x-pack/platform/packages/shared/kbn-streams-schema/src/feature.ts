/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema, type Condition } from '@kbn/streamlang';
import { z } from '@kbn/zod';
import { streamObjectNameSchema } from './shared/stream_object_name';

export interface Feature {
  name: string;
  description: string;
  filter: Condition;
}

export const featureSchema: z.Schema<Feature> = z.object({
  name: streamObjectNameSchema,
  description: z.string(),
  filter: conditionSchema,
});
