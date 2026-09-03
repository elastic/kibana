/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export interface CanvasUrlSchema {
  flyoutName?: string | null;
  flyoutTab?: string | null;
  focusNodeId?: string | null;
}

export const canvasUrlSchema = z.object({
  flyoutName: z.string().nullable(),
  flyoutTab: z.string().nullable(),
  focusNodeId: z.string().nullable().optional(),
}) satisfies z.ZodType<CanvasUrlSchema>;
