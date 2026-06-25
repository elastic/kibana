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
 * Fetch a v2 template by id + version, validate owner, and parse its definition.
 * Returns the ParsedTemplateDefinition, or null when the template cannot be found,
 * belongs to a different owner, or has an invalid definition (logs a warning in each case).
 */
export const resolveV2Template = async (
  casesClient: CasesClient,
  templateId: string,
  templateVersion: string,
  owner: string,
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

  if (so.attributes.owner !== owner) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template "${templateId}" belongs to owner "${so.attributes.owner}" but the connector is running for owner "${owner}". Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  const definition = parseTemplateDefinition(so.attributes.definition);
  if (!definition) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template "${templateId}" has an invalid definition. Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  return definition;
};
