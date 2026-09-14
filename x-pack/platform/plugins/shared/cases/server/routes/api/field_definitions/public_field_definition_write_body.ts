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
} from '../../../../common/constants';

/**
 * Public write body for POST/PUT /api/cases/field_definitions. Accepts only caller-ownable
 * attributes with explicit length bounds. Server-managed attributes (`fieldDefinitionId`,
 * `legacyKey`, `displayOrder`) are excluded — unknown keys are rejected so the accepted
 * surface can grow without ambiguity.
 *
 * `name` is optional: when omitted, the route layer extracts it from the YAML `definition`
 * via `validateFieldDefinitionYaml`. When provided, it must match the `name` in the YAML
 * (enforced at the client layer). This avoids forcing callers to repeat a value already
 * embedded in the definition.
 */
export const PublicFieldDefinitionWriteBodySchema = z.strictObject({
  name: z.string().min(1).max(MAX_FIELD_DEFINITION_NAME_LENGTH).optional(),
  owner: FieldDefinitionSchema.shape.owner,
  definition: z.string().max(MAX_FIELD_DEFINITION_DEFINITION_LENGTH),
  description: z.string().max(MAX_FIELD_DEFINITION_DESCRIPTION_LENGTH).optional(),
  isGlobal: FieldDefinitionSchema.shape.isGlobal,
});

export type PublicFieldDefinitionWriteBody = z.infer<typeof PublicFieldDefinitionWriteBodySchema>;
