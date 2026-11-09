/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as yamlParse } from 'yaml';
import type { ParsedTemplateDefinition } from '../../../../common/types/domain/template/v1';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { StrictFieldsArraySchema } from '../../../../common/types/domain/template/strict_fields';

interface DefinitionValidationSuccess {
  valid: true;
}

interface DefinitionValidationFailure {
  valid: false;
  message: string;
}

export type DefinitionValidationResult = DefinitionValidationSuccess | DefinitionValidationFailure;

type StructuralParseResult =
  | { valid: true; data: ParsedTemplateDefinition }
  | DefinitionValidationFailure;

/** Shared parse step: parseable YAML, then schema-valid against `ParsedTemplateDefinitionSchema`. */
const parseAndValidateStructure = (definition: string): StructuralParseResult => {
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

  return { valid: true, data: definitionResult.data };
};

/**
 * Validates a template write body's YAML `definition`: parseable YAML, then schema-valid against
 * `ParsedTemplateDefinitionSchema`. Does NOT check the authoring charset — use this for UPDATE
 * routes, where only `TemplatesService` (via `assertFieldNamesAreAuthorable`) has the existing
 * template needed to grandfather field names that predate the authoring-charset rule; re-running
 * an ungrandfathered strict check here would permanently lock a legacy-named template out of
 * every future edit, including ones that never touch the offending field.
 */
export const validateTemplateStructure = (definition: string): DefinitionValidationResult => {
  const result = parseAndValidateStructure(definition);
  return result.valid ? { valid: true } : result;
};

/**
 * Validates a template write body's YAML `definition`: structure (see `validateTemplateStructure`)
 * plus the authoring-charset check on every field name. Single source of truth shared by the
 * internal and public template CREATE routes (and the public create `dry_run` preflight) so their
 * acceptance criteria cannot drift. UPDATE routes use `validateTemplateStructure` instead — see
 * its doc for why the strict check can't be grandfather-aware at this layer.
 */
export const validateTemplateDefinition = (definition: string): DefinitionValidationResult => {
  const structuralResult = parseAndValidateStructure(definition);
  if (!structuralResult.valid) {
    return structuralResult;
  }

  // Check field names against the authoring charset (strict subset of the lenient read schema).
  // Runs separately from the structural check above so the error message names the offending
  // field rather than surfacing as a generic schema failure.
  const strictFieldsResult = StrictFieldsArraySchema.safeParse(structuralResult.data.fields);
  if (!strictFieldsResult.success) {
    const firstIssue = strictFieldsResult.error.issues[0];
    return {
      valid: false,
      message: firstIssue?.message ?? 'One or more field names are invalid.',
    };
  }

  return { valid: true };
};
