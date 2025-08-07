/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface StreamFeature {
  id: string; // e.g. "general", "system", "application", etc... Used to categorize features. For now we will only use "default" id.
  feature: string;
}

export const streamFeatureSchema: z.Schema<StreamFeature> = z.object({
  id: z.string(),
  feature: z.string(),
});

export const upsertStreamFeatureRequestSchema = z.object({
  feature: z.string(),
});
