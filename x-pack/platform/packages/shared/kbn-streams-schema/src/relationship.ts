/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Direction of the relationship between streams.
 * - directional: from_stream -> to_stream (one-way relationship)
 * - bidirectional: from_stream <-> to_stream (two-way relationship)
 */
export type RelationshipDirection = 'directional' | 'bidirectional';

/**
 * Source of how the relationship was created.
 * - manual: User explicitly created the relationship
 * - auto_detected: System detected the relationship based on shared fields
 */
export type RelationshipSource = 'manual' | 'auto_detected';

/**
 * A relationship between two streams.
 * This represents a semantic connection between streams that don't have a parent-child
 * relationship but are related (e.g., application logs and proxy logs for the same service).
 */
export interface Relationship {
  from_stream: string;
  to_stream: string;
  description: string;
  direction: RelationshipDirection;
  source: RelationshipSource;
  confidence?: number; // Only for auto_detected relationships (0-1)
}

export const relationshipDirectionSchema = z.enum(['directional', 'bidirectional']);

export const relationshipSourceSchema = z.enum(['manual', 'auto_detected']);

export const relationshipSchema: z.Schema<Relationship> = z.object({
  from_stream: z.string(),
  to_stream: z.string(),
  description: z.string(),
  direction: relationshipDirectionSchema,
  source: relationshipSourceSchema,
  confidence: z.number().min(0).max(1).optional(),
});

export function isRelationship(value: unknown): value is Relationship {
  return relationshipSchema.safeParse(value).success;
}
