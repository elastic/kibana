/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as yamlParse } from 'yaml';
import { parseFieldDefinitionIdentity } from '../../../common/utils/field_definitions';

interface ValidationSuccess {
  valid: true;
  /** The `name` parsed from the YAML definition. */
  name: string;
}

interface ValidationFailure {
  valid: false;
  message: string;
}

export type FieldDefinitionValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates a field definition write body's YAML `definition`: parseable YAML that contains a
 * recognisable field identity (name + type). Returns the parsed `name` on success so callers can
 * resolve an omitted top-level `name` from the YAML rather than duplicating it.
 *
 * Single source of truth shared by the internal and public CREATE and UPDATE routes so their
 * acceptance criteria cannot drift.
 */
export const validateFieldDefinitionYaml = (
  definition: string
): FieldDefinitionValidationResult => {
  try {
    yamlParse(definition);
  } catch (yamlError) {
    return { valid: false, message: `Invalid YAML definition: ${yamlError}` };
  }

  const identity = parseFieldDefinitionIdentity(definition);
  if (!identity) {
    return {
      valid: false,
      message:
        'Invalid field definition: the YAML must contain a valid field schema with at least a "name" and "type".',
    };
  }

  return { valid: true, name: identity.name };
};
