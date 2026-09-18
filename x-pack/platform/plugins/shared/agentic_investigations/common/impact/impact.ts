/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { proposalUserSchema } from '../proposals/proposal';
import { MAX_ENTITY_ID_LENGTH, MAX_ENTITY_IDS } from './constants';

/**
 * Every string and collection reaching the HTTP layer is bounded, so an
 * unbounded body cannot exhaust memory or the index.
 */
const MAX_ID_LENGTH = 256;
const MAX_TIMESTAMP_LENGTH = 64;

export const impactEntityIdSchema = z.string().min(1).max(MAX_ENTITY_ID_LENGTH);
export const impactEntityIdsSchema = z.array(impactEntityIdSchema).min(1).max(MAX_ENTITY_IDS);

export const impactSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  /** Deduped opaque ids of the entities this investigation is about. */
  entityIds: impactEntityIdsSchema,
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: proposalUserSchema.optional(),
});
export type Impact = z.infer<typeof impactSchema>;

export const attachImpactRequestSchema = z.object({
  conversationId: z.string().min(1).max(MAX_ID_LENGTH),
  entityIds: impactEntityIdsSchema,
});
export type AttachImpactRequest = z.infer<typeof attachImpactRequestSchema>;

export const getImpactQuerySchema = z.object({
  conversationId: z.string().min(1).max(MAX_ID_LENGTH),
});
export type GetImpactQuery = z.infer<typeof getImpactQuerySchema>;
