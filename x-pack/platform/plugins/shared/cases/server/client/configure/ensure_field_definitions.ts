/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { Logger } from '@kbn/core/server';
import type { FieldDefinitionsService } from '../../services';
import { buildFieldDefinitionYaml } from '../../common/utils/field_definitions';

interface CustomFieldLike {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

/**
 * Ensures a global `cases-field-definition` SO exists for each provided custom field.
 *
 * Semantics (mirrors `migrateFieldDefinitions` in the one-shot migration task):
 * - **Create-if-missing only.** An existing definition with the same `name` is reused without
 *   modification. A control/type mismatch between the existing definition and what would be
 *   generated from the custom field is logged as a warning.
 * - **Non-fatal.** Per-field errors are caught and logged; a field-definition failure must never
 *   fail the configuration write (which has already been persisted by the time this helper runs).
 *
 * Authorization: the configure create/update operations already performed their own authz before
 * persisting. Field-definition creation goes through the unsecured SO client (same as the
 * migration task and the existing write-time adapter).
 */
export const ensureGlobalFieldDefinitions = async ({
  owner,
  customFields,
  fieldDefinitionsService,
  logger,
}: {
  owner: string;
  customFields: CustomFieldLike[] | null | undefined;
  fieldDefinitionsService: FieldDefinitionsService;
  logger: Logger;
}): Promise<void> => {
  if (!customFields?.length) {
    return;
  }

  try {
    const { fieldDefinitions: existing } = await fieldDefinitionsService.getFieldDefinitions(
      owner,
      { isGlobal: true }
    );
    const existingByName = new Map(existing.map((fd) => [fd.name, fd]));

    for (const cf of customFields) {
      const existingDef = existingByName.get(cf.key);

      if (existingDef) {
        // Existing-wins: check for a control/type mismatch and warn, but never overwrite.
        const { yaml: expectedYaml } = buildFieldDefinitionYaml(cf);
        const existingParsed = parseYaml(existingDef.definition ?? '') as Record<string, unknown>;
        const expectedParsed = parseYaml(expectedYaml) as Record<string, unknown>;

        if (
          existingParsed?.control !== expectedParsed?.control ||
          existingParsed?.type !== expectedParsed?.type
        ) {
          logger.warn(
            `Field definition "${cf.key}" (owner: "${owner}") already exists but has ` +
              `control="${existingParsed?.control}" / type="${existingParsed?.type}", ` +
              `expected control="${expectedParsed?.control}" / type="${expectedParsed?.type}" ` +
              `from the configure custom field — reusing existing without modification`
          );
        }
      } else {
        try {
          const { yaml } = buildFieldDefinitionYaml(cf);
          await fieldDefinitionsService.createFieldDefinition({
            name: cf.key,
            owner,
            definition: yaml,
            description: cf.label,
            isGlobal: true,
          });
        } catch (err) {
          logger.error(
            `Failed to create global field definition for custom field "${cf.key}" ` +
              `(owner: "${owner}"): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  } catch (err) {
    logger.error(
      `Failed to ensure global field definitions for owner "${owner}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
