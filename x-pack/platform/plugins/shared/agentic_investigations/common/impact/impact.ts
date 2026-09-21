/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { proposalUserSchema } from '../proposals/proposal';
import { MAX_ENTITY_ID_LENGTH, MAX_ENTITY_IDS, MAX_ENTITY_NAME_LENGTH } from './constants';

/**
 * Every string and collection reaching the HTTP layer is bounded, so an
 * unbounded body cannot exhaust memory or the index.
 */
const MAX_ID_LENGTH = 256;
const MAX_TIMESTAMP_LENGTH = 64;

/**
 * One affected entity. `id` is the stable key both solutions filter on.
 * AlertZero sends an Entity Store id and may omit `name` until hydration.
 * Nightshift sends the service name plus, when it has them, type, Knowledge
 * Indicator id, and stream — the fields on `InvestigationImpactEntity`, in
 * camelCase. Evidence is not stored here: Nightshift's current evidence shape
 * cannot represent non-local data, and that format is still open.
 */
export const impactEntitySchema = z.object({
  id: z.string().min(1).max(MAX_ENTITY_ID_LENGTH),
  name: z.string().min(1).max(MAX_ENTITY_NAME_LENGTH).optional(),
  type: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
  featureId: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
  streamName: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
});
export type ImpactEntity = z.infer<typeof impactEntitySchema>;

export const impactEntitiesSchema = z.array(impactEntitySchema).min(1).max(MAX_ENTITY_IDS);

export const impactSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  /** Deduped by `id`. A later attach fills in fields the first write omitted. */
  entities: impactEntitiesSchema,
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: proposalUserSchema.optional(),
});
export type Impact = z.infer<typeof impactSchema>;

export const attachImpactRequestSchema = z.object({
  conversationId: z.string().min(1).max(MAX_ID_LENGTH),
  entities: impactEntitiesSchema,
});
export type AttachImpactRequest = z.infer<typeof attachImpactRequestSchema>;

export const getImpactQuerySchema = z.object({
  conversationId: z.string().min(1).max(MAX_ID_LENGTH),
});
export type GetImpactQuery = z.infer<typeof getImpactQuerySchema>;
