/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import {
  TEMPLATE_DEFINITION_EMPTY,
  INVALID_YAML_NON_OBJECT,
  INVALID_YAML_DEFINITION,
  TEMPLATE_MISSING_REQUIRED_KEYS,
} from '../translations';
import { REQUIRED_TEMPLATE_ROOT_KEYS } from '../constants';
import { normalizeTemplateCaseDefaultsForValidation } from './normalize_template_case_defaults';

export type TemplateDefinitionValidationResult =
  | { success: true }
  | { success: false; message: string };

/**
 * Editor-only completeness check: the YAML must always contain the case-default keys plus the
 * `fields` block (the shared REQUIRED_TEMPLATE_ROOT_KEYS), so the YAML stays a complete
 * representation of the render panel's YAML-backed sections. Removing any of them surfaces here as
 * an error. This is intentionally NOT enforced by the runtime schema, which stays lenient for
 * back-compat. `settings`/`connector` are excluded — they are panel-owned and must never gate the
 * preview (see REQUIRED_TEMPLATE_ROOT_KEYS).
 */
export const getMissingRequiredKeys = (definition: Record<string, unknown>): string[] =>
  REQUIRED_TEMPLATE_ROOT_KEYS.filter((key) => !(key in definition));

export const validateTemplateDefinitionYaml = (
  definition: string
): TemplateDefinitionValidationResult => {
  try {
    if (!definition || definition.trim() === '') {
      return { success: false, message: TEMPLATE_DEFINITION_EMPTY };
    }

    const parsedDefinition = parseYaml(definition);

    if (!parsedDefinition || typeof parsedDefinition !== 'object') {
      return { success: false, message: INVALID_YAML_NON_OBJECT };
    }

    const normalizedDefinition = normalizeTemplateCaseDefaultsForValidation(parsedDefinition);
    const result = ParsedTemplateDefinitionSchema.safeParse(normalizedDefinition);
    if (!result.success) {
      return { success: false, message: result.error.message };
    }

    const missingKeys = getMissingRequiredKeys(normalizedDefinition as Record<string, unknown>);
    if (missingKeys.length > 0) {
      return { success: false, message: TEMPLATE_MISSING_REQUIRED_KEYS(missingKeys) };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : INVALID_YAML_DEFINITION,
    };
  }
};
