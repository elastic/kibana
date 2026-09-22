/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as yamlParse } from 'yaml';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';

interface DefinitionValidationSuccess {
  valid: true;
}

interface DefinitionValidationFailure {
  valid: false;
  message: string;
}

export type DefinitionValidationResult = DefinitionValidationSuccess | DefinitionValidationFailure;

/**
 * Validates a template write body's YAML `definition`: parseable YAML, then schema-valid against
 * `ParsedTemplateDefinitionSchema`. Single source of truth shared by the internal and public
 * template write routes (and the public `dry_run` preflight) so their acceptance criteria cannot
 * drift.
 */
export const validateTemplateDefinition = (definition: string): DefinitionValidationResult => {
  let parsedYaml: unknown;
  try {
    parsedYaml = yamlParse(definition);
  } catch (yamlError) {
    return { valid: false, message: `Invalid YAML definition: ${yamlError}` };
  }

  const definitionResult = ParsedTemplateDefinitionSchema.safeParse(parsedYaml);
  if (!definitionResult.success) {
    return {
      valid: false,
      message: `Invalid template definition: ${JSON.stringify(definitionResult.error.issues)}`,
    };
  }

  return { valid: true };
};
