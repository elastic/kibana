/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { investigationEvidenceSchema, MAX_EVIDENCE_TEXT_LENGTH } from '../evidence/evidence';
import { userSchema } from '../user';
import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_IDS,
  MAX_ENTITY_NAME_LENGTH,
  MAX_IMPACT_ID_LENGTH,
} from './constants';

/**
 * Every string and collection reaching the HTTP layer is bounded, so an
 * unbounded body cannot exhaust memory or the index.
 */
const MAX_TIMESTAMP_LENGTH = 64;

/**
 * One affected entity. `id` is the stable key both solutions filter on.
 * AlertZero sends an Entity Store id and may omit `name` until hydration.
 * Nightshift sends the service name plus, when it has them, type, Knowledge
 * Indicator id, stream, and evidence of how this entity was affected.
 */
export const impactEntitySchema = z.object({
  id: z.string().min(1).max(MAX_ENTITY_ID_LENGTH),
  name: z.string().min(1).max(MAX_ENTITY_NAME_LENGTH).optional(),
  type: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
  featureId: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
  streamName: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
  /** How this entity was affected, ideally a chart of its failure signal. */
  evidence: investigationEvidenceSchema.optional(),
});
export type ImpactEntity = z.infer<typeof impactEntitySchema>;

/** Entities a write sends: at least one, so an attach always adds something. */
export const impactEntitiesSchema = z.array(impactEntitySchema).min(1).max(MAX_ENTITY_IDS);

/**
 * Entities a stored document holds. May be empty or absent: an agent can describe impact with
 * only a summary and evidence, and documents written before that still carry entities.
 */
export const storedImpactEntitiesSchema = z.array(impactEntitySchema).max(MAX_ENTITY_IDS);

/**
 * Stored impact document. Validates both documents written before summary and evidence existed
 * (entities only) and those an agent writes (summary, evidence, entities in any combination).
 */
export const impactSchema = z.object({
  id: z.string().max(MAX_IMPACT_ID_LENGTH),
  spaceId: z.string().max(MAX_IMPACT_ID_LENGTH),
  conversationId: z.string().max(MAX_IMPACT_ID_LENGTH),
  /** Business-facing account of the impact: what was affected, how badly, for how long. */
  summary: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** Evidence backing the summary when there are no per-entity differences to show. */
  evidence: investigationEvidenceSchema.optional(),
  /** Deduped by `id`. A later attach fills in fields the first write omitted. */
  entities: storedImpactEntitiesSchema.optional(),
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: userSchema.optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
});
export type Impact = z.infer<typeof impactSchema>;

export const attachImpactRequestSchema = z.object({
  conversationId: z.string().min(1).max(MAX_IMPACT_ID_LENGTH),
  entities: impactEntitiesSchema,
});
export type AttachImpactRequest = z.infer<typeof attachImpactRequestSchema>;

export const getImpactQuerySchema = z.object({
  conversationId: z.string().min(1).max(MAX_IMPACT_ID_LENGTH),
});
export type GetImpactQuery = z.infer<typeof getImpactQuerySchema>;
