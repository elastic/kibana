/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineOperation } from './types';

export const removeControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('remove_controls'),
    control_ids: z
      .array(z.string().max(256))
      .min(1)
      .max(256)
      .describe('IDs of controls to remove (from the controls[] list in the tool result).'),
  }),
  handler: ({ dashboardData, operation }) => {
    const idsToRemove = new Set(operation.control_ids);
    return {
      ...dashboardData,
      pinned_panels: (dashboardData.pinned_panels ?? []).filter(
        (control) => !idsToRemove.has((control as { id?: string }).id ?? '')
      ),
    };
  },
});
