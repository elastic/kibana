/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Configuration schema for overrides to the table configuration that can be persisted across sessions.
 * This should include only the serializable properties that are user-configurable, all other props
 * will be removed by parsing to avoid saving unnecessary or non-serializable objects.
 */
export const alertsTableConfigurationSchema = z.object({
  columns: z
    .array(
      z.object({
        id: z.string(),
        initialWidth: z.number().optional(),
      })
    )
    .optional(),
  visibleColumns: z.array(z.string()).optional(),
  sort: z.array(z.record(z.string(), z.object({ order: z.enum(['asc', 'desc']) }))).optional(),
});

export type AlertsTableConfiguration = z.infer<typeof alertsTableConfigurationSchema>;
