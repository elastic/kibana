/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { Logger } from '@kbn/core/server';
import type { FieldDefinitionsService } from '../../services';
import {
  buildFieldDefinitionYaml,
  buildFieldDefinitionNameIndex,
  normalizeFieldDefinitionName,
} from '../../common/utils/field_definitions';
import { MAX_FIELD_DEFINITIONS_PER_OWNER } from '../../../common/constants';

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
 * - **Create-if-missing only.** An existing definition with the same `name` (case-insensitive)
 *   is reused without modification. A control/type mismatch between the existing definition
 *   and what would be generated from the custom field is logged as a warning.
 * - **All definitions are checked, not only `isGlobal: true`.** A non-global definition with
 *   the same name is treated as existing-wins: the create is skipped and a warning is logged
 *   (we intentionally do not flip `isGlobal` — that would overwrite an explicit user choice).
 * - **Cap-aware.** Once `MAX_FIELD_DEFINITIONS_PER_OWNER` is reached the remaining custom
 *   fields are skipped with a single warning; the configure write (already persisted by the
 *   time this helper runs) is unaffected.
 * - **Non-fatal.** Per-field errors are caught and logged; a field-definition failure must
 *   never fail the configuration write.
 *
 * Authorization: the configure create/update operations already performed their own authz
 * before persisting. Field-definition creation goes through the unsecured SO client (same as
 * the migration task and the existing write-time adapter).
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
    // Read ALL definitions for the owner (not just isGlobal: true) so that a field
    // definition the user manually set to isGlobal: false is still detected and we
    // don't silently create a duplicate.
    const { fieldDefinitions: existing } = await fieldDefinitionsService.getFieldDefinitions(owner);
    // Case-insensitive index (first-wins on pre-existing duplicates).
    const existingByName = buildFieldDefinitionNameIndex(existing, (fd) => fd.name);
    let totalCount = existing.length;

    const skippedKeys: string[] = [];

    for (const cf of customFields) {
      const existingDef = existingByName.get(normalizeFieldDefinitionName(cf.key));

      if (existingDef) {
        if (!existingDef.isGlobal) {
          // The user intentionally set this to non-global via the field library — do not
          // overwrite that choice, but warn so the operator knows the custom field will
          // not automatically render on all cases.
          logger.warn(
            `Field definition "${cf.key}" (owner: "${owner}") already exists as a ` +
              `non-global definition — skipping auto-creation so the user's choice is ` +
              `preserved. The custom field will not render as a global field.`
          );
        } else {
          // Global existing-wins: check for a control/type mismatch and warn, but never overwrite.
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
        }
      } else if (totalCount >= MAX_FIELD_DEFINITIONS_PER_OWNER) {
        skippedKeys.push(cf.key);
      } else {
        try {
          const { yaml } = buildFieldDefinitionYaml(cf);
          const createdSo = await fieldDefinitionsService.createFieldDefinition({
            name: cf.key,
            owner,
            definition: yaml,
            description: cf.label,
            isGlobal: true,
          });

          // Insert into the index so intra-request duplicate keys only produce one SO.
          existingByName.set(normalizeFieldDefinitionName(cf.key), createdSo.attributes);
          totalCount++;
        } catch (err) {
          logger.error(
            `Failed to create global field definition for custom field "${cf.key}" ` +
              `(owner: "${owner}"): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    if (skippedKeys.length > 0) {
      logger.warn(
        `Reached the maximum of ${MAX_FIELD_DEFINITIONS_PER_OWNER} field definitions for ` +
          `owner "${owner}" — the following custom fields were not mirrored as global field ` +
          `definitions: ${skippedKeys.join(', ')}`
      );
    }
  } catch (err) {
    logger.error(
      `Failed to ensure global field definitions for owner "${owner}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
