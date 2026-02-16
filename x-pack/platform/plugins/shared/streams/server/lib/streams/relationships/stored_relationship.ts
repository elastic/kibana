/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  relationshipDirectionSchema,
  relationshipSourceSchema,
  type RelationshipDirection,
  type RelationshipSource,
} from '@kbn/streams-schema';
import {
  RELATIONSHIP_UUID,
  FROM_STREAM,
  TO_STREAM,
  RELATIONSHIP_DESCRIPTION,
  RELATIONSHIP_DIRECTION,
  RELATIONSHIP_SOURCE,
  RELATIONSHIP_CONFIDENCE,
  RELATIONSHIP_UPDATED_AT,
} from './fields';

export interface StoredRelationship {
  [RELATIONSHIP_UUID]: string;
  [FROM_STREAM]: string;
  [TO_STREAM]: string;
  [RELATIONSHIP_DESCRIPTION]: string;
  [RELATIONSHIP_DIRECTION]: RelationshipDirection;
  [RELATIONSHIP_SOURCE]: RelationshipSource;
  [RELATIONSHIP_CONFIDENCE]?: number;
  [RELATIONSHIP_UPDATED_AT]: string;
}

export const storedRelationshipSchema: z.Schema<StoredRelationship> = z.object({
  [RELATIONSHIP_UUID]: z.string(),
  [FROM_STREAM]: z.string(),
  [TO_STREAM]: z.string(),
  [RELATIONSHIP_DESCRIPTION]: z.string(),
  [RELATIONSHIP_DIRECTION]: relationshipDirectionSchema,
  [RELATIONSHIP_SOURCE]: relationshipSourceSchema,
  [RELATIONSHIP_CONFIDENCE]: z.number().min(0).max(1).optional(),
  [RELATIONSHIP_UPDATED_AT]: z.string(),
});
