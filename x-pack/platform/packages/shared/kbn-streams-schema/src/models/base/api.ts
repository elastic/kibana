/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

export interface StreamGetResponseBase {
  dashboards: string[];
}

export interface StreamUpsertRequestBase {
  dashboards: string[];
}

export const streamUpsertRequestSchemaBase: z.Schema<StreamUpsertRequestBase> = z.object({
  dashboards: z.array(NonEmptyString),
});

export const streamGetResponseSchemaBase: z.Schema<StreamGetResponseBase> = z.object({
  dashboards: z.array(NonEmptyString),
});
