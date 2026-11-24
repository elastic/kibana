/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const upsertOptionsSchema = lazySchema(() =>
  z.looseObject({
    hide_panel_titles: z.boolean().optional().describe('Hide panel titles. Defaults to false.'),
    hide_panel_borders: z.boolean().optional().describe('Hide panel borders. Defaults to false.'),
    use_margins: z
      .boolean()
      .optional()
      .describe('Separate panels with a margin. Defaults to true.'),
    sync_colors: z
      .boolean()
      .optional()
      .describe('Synchronize colors across panels that share a data source. Defaults to false.'),
    sync_tooltips: z
      .boolean()
      .optional()
      .describe('Synchronize tooltips across panels. Defaults to false.'),
    sync_cursor: z
      .boolean()
      .optional()
      .describe('Synchronize the cursor position across panels. Defaults to true.'),
    auto_apply_filters: z
      .boolean()
      .optional()
      .describe(
        'When false, control filter changes apply only after the user clicks the update button. Defaults to true.'
      ),
  })
);

export type UpsertOptions = z.infer<typeof upsertOptionsSchema>;

// Browsers store timer delays as 32-bit signed integers; a longer interval overflows and the
// dashboard refreshes continuously.
const MAX_REFRESH_INTERVAL_MS = 2_147_483_647;

export const upsertRefreshIntervalSchema = lazySchema(() =>
  z.object({
    pause: z.boolean().describe('false runs auto-refresh, true pauses it.'),
    value: z
      .number()
      .int()
      .min(1000)
      .max(MAX_REFRESH_INTERVAL_MS)
      .describe(
        'Interval in milliseconds, e.g. 30000 for 30 seconds. Values below the deployment minimum (5 seconds on serverless) run at that minimum.'
      ),
  })
);
