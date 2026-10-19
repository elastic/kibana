/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { FieldDefinitionSchema } from '../../../../common/types/domain/field_definition/v1';
import {
  MAX_FIELD_DEFINITION_NAME_LENGTH,
  MAX_FIELD_DEFINITION_DESCRIPTION_LENGTH,
  MAX_FIELD_DEFINITION_DEFINITION_LENGTH,
  MAX_OWNER_LENGTH,
} from '../../../../common/constants';

const sharedFields = {
  owner: z.string().min(1).max(MAX_OWNER_LENGTH),
  description: z.string().max(MAX_FIELD_DEFINITION_DESCRIPTION_LENGTH).optional(),
  isGlobal: FieldDefinitionSchema.shape.isGlobal,
};

/** POST body — enforces the 30 000-char definition limit on new creates. */
export const PublicFieldDefinitionWriteBodySchema = z.strictObject({
  ...sharedFields,
  // POST creates a new identity: enforce the 50-char public name limit.
  name: z.string().min(1).max(MAX_FIELD_DEFINITION_NAME_LENGTH).optional(),
  definition: z.string().max(MAX_FIELD_DEFINITION_DEFINITION_LENGTH),
});

/**
 * PUT body — does NOT enforce the 50-char name or 30 000-char definition limits so that existing
 * definitions created via internal tools (with longer names/definitions) remain modifiable.
 * DoS-prevention upper bounds still apply.
 * The identity-immutability guard in the client rejects any name change regardless.
 */
export const PublicFieldDefinitionPutBodySchema = z.strictObject({
  ...sharedFields,
  // PUT preserves an existing identity: a stored name may exceed the 50-char POST limit.
  // Bounded to 1 000 chars to prevent unbounded input; the identity guard rejects changes.
  name: z.string().min(1).max(1_000).optional(),
  definition: z.string().max(1_000_000),
});

export type PublicFieldDefinitionWriteBody = z.infer<typeof PublicFieldDefinitionWriteBodySchema>;
export type PublicFieldDefinitionPutBody = z.infer<typeof PublicFieldDefinitionPutBodySchema>;
