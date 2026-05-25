/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load as parseYaml } from 'js-yaml';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';

export type TemplateDefinitionValidationResult =
  | { success: true }
  | { success: false; message: string };

export const validateTemplateDefinitionYaml = (
  definition: string
): TemplateDefinitionValidationResult => {
  try {
    if (!definition || definition.trim() === '') {
      return { success: false, message: 'Template definition is empty' };
    }

    const parsedDefinition = parseYaml(definition);

    if (!parsedDefinition || typeof parsedDefinition !== 'object') {
      return { success: false, message: 'Invalid YAML: parsed to null or non-object' };
    }

    const result = ParsedTemplateDefinitionSchema.safeParse(parsedDefinition);
    if (!result.success) {
      return { success: false, message: result.error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid YAML definition',
    };
  }
};
