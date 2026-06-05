/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineOperation } from './types';

export const setMetadataOperation = defineOperation({
  schema: z.object({
    operation: z.literal('set_metadata'),
    title: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Non-empty dashboard title. If the current title is empty, missing, or a placeholder, invent one from the dashboard's contents."
      ),
    description: z.string().optional(),
  }),
  handler: ({ dashboardData, operation, context }) => {
    if (operation.title === undefined && operation.description === undefined) {
      context.logger.debug('Skipping empty set_metadata operation');
      return dashboardData;
    }

    const metadataPatch = {
      ...(operation.title !== undefined ? { title: operation.title } : {}),
      ...(operation.description !== undefined ? { description: operation.description } : {}),
    };

    return {
      ...dashboardData,
      ...metadataPatch,
    };
  },
});
