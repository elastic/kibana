/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * On-disk format of a render payload file (e.g. `/workspace/renders/{type}/{id}.json`).
 */
export const renderFileSchema = z.object({
  type: z.string().optional(),
  data: z.unknown(),
});

export type RenderFile = z.infer<typeof renderFileSchema>;
