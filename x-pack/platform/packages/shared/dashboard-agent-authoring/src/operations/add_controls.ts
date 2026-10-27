/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { appendControls, controlInputSchema } from '../controls';
import { defineOperation } from './types';

export const addControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_controls'),
    controls: z
      .array(controlInputSchema)
      .min(1)
      .describe(
        'Controls to append. Use options_list_control for categorical/keyword fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard).'
      ),
  }),
  handler: ({ dashboardData, operation, context }) =>
    appendControls({
      dashboardData,
      controls: operation.controls,
      logger: context.logger,
      failures: context.failures,
      resolveControlFieldCapabilities: context.resolveControlFieldCapabilities,
    }),
});
