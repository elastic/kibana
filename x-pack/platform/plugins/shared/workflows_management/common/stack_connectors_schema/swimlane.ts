/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/swimlane/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { lazySchema, z } from '@kbn/zod/v4';

// Swimlane connector parameter schemas for different sub-actions
export const SwimlaneCreateRecordParamsSchema = lazySchema(() =>
  z.object({
    incident: z.object({
      ruleName: z.string(),
      alertId: z.string(),
      severity: z.string().optional(),
      description: z.string().optional(),
    }),
    comments: z
      .array(
        z.object({
          comment: z.string(),
          commentId: z.string(),
        })
      )
      .optional(),
  })
);

export const SwimlaneUpdateRecordParamsSchema = lazySchema(() =>
  z.object({
    incident: z.object({
      ruleName: z.string(),
      alertId: z.string(),
      severity: z.string().optional(),
      description: z.string().optional(),
    }),
    incidentId: z.string(),
    comments: z
      .array(
        z.object({
          comment: z.string(),
          commentId: z.string(),
        })
      )
      .optional(),
  })
);

// Swimlane connector response schema
export const SwimlaneResponseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    url: z.string(),
    pushedDate: z.string(),
  })
);
