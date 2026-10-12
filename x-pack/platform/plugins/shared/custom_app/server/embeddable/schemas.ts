/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { customAppStateSchema } from '@kbn/custom-app-common';

export const customAppEmbeddableSchema = z.object({
  ...customAppStateSchema.shape,
  ...serializedTitlesSchema.shape,
});

export type CustomAppEmbeddableState = z.output<typeof customAppEmbeddableSchema>;
