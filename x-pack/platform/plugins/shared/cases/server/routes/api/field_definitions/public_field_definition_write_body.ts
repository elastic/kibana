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
  name: z.string().min(1).max(MAX_FIELD_DEFINITION_NAME_LENGTH).optional(),
  owner: z.string().min(1).max(MAX_OWNER_LENGTH),
  description: z.string().max(MAX_FIELD_DEFINITION_DESCRIPTION_LENGTH).optional(),
  isGlobal: FieldDefinitionSchema.shape.isGlobal,
};

/** POST body — enforces the 30 000-char definition limit on new creates. */
export const PublicFieldDefinitionWriteBodySchema = z.strictObject({
  ...sharedFields,
  definition: z.string().max(MAX_FIELD_DEFINITION_DEFINITION_LENGTH),
});

/**
 * PUT body — does NOT enforce definition length so that existing definitions whose stored YAML
 * exceeds the public limit (created via internal tools before this API existed) remain
 * modifiable. A DoS-prevention upper bound (1 MB) still applies.
 */
export const PublicFieldDefinitionPutBodySchema = z.strictObject({
  ...sharedFields,
  definition: z.string().max(1_000_000),
});

export type PublicFieldDefinitionWriteBody = z.infer<typeof PublicFieldDefinitionWriteBodySchema>;
export type PublicFieldDefinitionPutBody = z.infer<typeof PublicFieldDefinitionPutBodySchema>;
