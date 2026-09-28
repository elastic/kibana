/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';

export interface PublicFieldDefinition {
  fieldDefinitionId: string;
  name: string;
  definition: string;
  owner: string;
  description?: string;
  isGlobal?: boolean;
  displayOrder?: number;
}

/** Maps a stored FieldDefinition to its public API shape, omitting the server-managed `legacyKey`. */
export const toPublicFieldDefinition = ({
  fieldDefinitionId,
  name,
  definition,
  owner,
  description,
  isGlobal,
  displayOrder,
}: FieldDefinition): PublicFieldDefinition => ({
  fieldDefinitionId,
  name,
  definition,
  owner,
  ...(description !== undefined ? { description } : {}),
  ...(isGlobal !== undefined ? { isGlobal } : {}),
  ...(displayOrder !== undefined ? { displayOrder } : {}),
});
