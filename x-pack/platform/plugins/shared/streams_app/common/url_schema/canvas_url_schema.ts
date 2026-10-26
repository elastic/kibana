/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export type CanvasFlyoutKind = 'destination' | 'index';

export interface CanvasUrlSchema {
  flyoutName?: string | null;
  flyoutKind?: CanvasFlyoutKind | null;
  flyoutTab?: string | null;
  query?: string | null;
}

export const canvasUrlSchema = z.object({
  flyoutName: z.string().nullable(),
  flyoutKind: z.enum(['destination', 'index']).nullable().optional(),
  flyoutTab: z.string().nullable(),
  query: z.string().nullish(),
}) satisfies z.ZodType<CanvasUrlSchema>;
