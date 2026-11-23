/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { lazySchema, z } from '@kbn/zod/v4';

// Bedrock connector parameter schema
export const BedrockParamsSchema = lazySchema(() =>
  z.object({
    body: z.string(),
    model: z.string().optional(),
  })
);

// Bedrock connector response schema
export const BedrockResponseSchema = lazySchema(() =>
  z.object({
    completion: z.string(),
    stop_reason: z.string().optional(),
  })
);
