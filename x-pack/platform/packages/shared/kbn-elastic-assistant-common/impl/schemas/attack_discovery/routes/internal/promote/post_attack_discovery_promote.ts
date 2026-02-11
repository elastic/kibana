/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const PostAttackDiscoveryPromoteRequestBody = z.object({
  attack_ids: z.array(z.string()).min(1),
});

export type PostAttackDiscoveryPromoteRequestBody = z.infer<
  typeof PostAttackDiscoveryPromoteRequestBody
>;

export const PostAttackDiscoveryPromoteResponse = z.object({
  success: z.boolean(),
  execution_uuid: z.string().optional(),
  error: z.string().optional(),
});

export type PostAttackDiscoveryPromoteResponse = z.infer<typeof PostAttackDiscoveryPromoteResponse>;
