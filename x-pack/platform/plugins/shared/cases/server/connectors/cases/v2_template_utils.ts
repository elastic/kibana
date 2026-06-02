/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import type { Logger } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import type { CasesClient } from '../../client';

export type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

/**
 * Parse a raw YAML definition string into a validated ParsedTemplateDefinition.
 * Returns null if the YAML is invalid or fails schema validation.
 */
export const parseTemplateDefinition = (
  definitionYaml: string
): ParsedTemplateDefinition | null => {
  try {
    const raw = yaml.load(definitionYaml);
    const result = ParsedTemplateDefinitionSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

/**
 * Merge parent and child template definitions (single-level inheritance).
 * Child scalar metadata (name, description, tags, severity, category) takes precedence.
 * fields[] is NOT merged — the connector does not apply extended fields at case-creation time.
 */
export const mergeV2TemplateDefinitions = (
  parent: ParsedTemplateDefinition,
  child: ParsedTemplateDefinition
): ParsedTemplateDefinition => ({
  name: child.name,
  description: child.description ?? parent.description,
  tags: child.tags ?? parent.tags,
  severity: child.severity ?? parent.severity,
  category: child.category ?? parent.category,
  extends: child.extends,
  fields: child.fields,
});

/**
 * Fetch a v2 template by id + version, parse its definition, and resolve a single-level
 * `extends` parent if present. Returns the merged ParsedTemplateDefinition, or null when
 * the template cannot be found or parsed (logs a warning in that case).
 */
export const resolveV2Template = async (
  casesClient: CasesClient,
  templateId: string,
  templateVersion: string,
  logger: Logger
): Promise<ParsedTemplateDefinition | null> => {
  const so = await casesClient.templates.getTemplate(templateId, templateVersion, {
    includeDeleted: false,
  });

  if (!so) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template with id "${templateId}" version "${templateVersion}" not found or has been deleted. Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  const childDefinition = parseTemplateDefinition(so.attributes.definition);
  if (!childDefinition) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template "${templateId}" has an invalid definition. Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  if (!childDefinition.extends) {
    return childDefinition;
  }

  // Resolve single-level parent
  const parentSo = await casesClient.templates.getTemplate(childDefinition.extends, undefined, {
    includeDeleted: false,
  });

  if (!parentSo) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Parent template "${childDefinition.extends}" referenced by "${templateId}" not found. Using child definition only.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return childDefinition;
  }

  const parentDefinition = parseTemplateDefinition(parentSo.attributes.definition);
  if (!parentDefinition) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Parent template "${childDefinition.extends}" has an invalid definition. Using child definition only.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return childDefinition;
  }

  return mergeV2TemplateDefinitions(parentDefinition, childDefinition);
};
