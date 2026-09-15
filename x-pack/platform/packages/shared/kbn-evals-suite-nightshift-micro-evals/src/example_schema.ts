/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const textSchema = z.string().max(1_000_000);
export const metadataSchema = z
  .object({
    langsmith_example_id: z.string().min(1).max(500),
    source_kbn_example_id: z.string().min(1).max(500).optional(),
    dataset_split: z.array(z.string().max(500)).max(100).optional(),
    status: z.string().max(100).optional(),
    case_type: z.string().max(500).optional(),
  })
  .catchall(z.json());
