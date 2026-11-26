/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

/**
 * Torq connector parameter schema
 * Based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/torq/index.ts
 */
export const TorqParamsSchema = lazySchema(() =>
  z.object({
    body: z.string().describe('JSON payload to send to Torq'),
  })
);

/**
 * Torq connector response schema
 * Torq returns the sent data on successful execution
 */
export const TorqResponseSchema = lazySchema(() => z.any().describe('Response from Torq webhook'));
