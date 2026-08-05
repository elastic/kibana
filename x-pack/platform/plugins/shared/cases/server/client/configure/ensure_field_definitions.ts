/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { FieldDefinitionsService } from '../../services';
import type {
  FieldLinkIndexes,
  LinkableFieldDefinition,
} from '../../common/utils/field_link_resolution';
import {
  buildFieldLinkIndexes,
  addDefinitionToIndexes,
  registerRepairedLegacyKey,
  resolveDefinitionForLegacyField,
} from '../../common/utils/field_link_resolution';
import { ensureLinkedFieldDefinition } from '../../common/utils/ensure_linked_field_definition';
import { MAX_FIELD_DEFINITIONS_PER_OWNER } from '../../../common/constants';

interface CustomFieldLike {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

type BlockedReason =
  | 'duplicate_legacy_key'
  | 'type_mismatch'
  | 'unparseable_definition'
  | 'ambiguous_name_match'
  | 'capacity';

const BLOCKED_REASON_DESCRIPTIONS: Record<BlockedReason, string> = {
  duplicate_legacy_key: 'multiple field definitions claim this custom field key',
  type_mismatch: 'the linked field definition has an incompatible type',
  unparseable_definition: 'the linked field definition YAML cannot be parsed',
  ambiguous_name_match: 'multiple field definitions ambiguously match this custom field key',
  capacity: `the maximum of ${MAX_FIELD_DEFINITIONS_PER_OWNER} field definitions per owner is reached`,
};

/**
 * Ensures a linked `cases-field-definition` SO exists for each provided custom
 * field **before** the configuration is persisted (addendum A1): a configured
 * v1 field must never become active without its v2 definition.
 *
 * Semantics:
 * - **Link resolution first** (`legacyKey` → exact name → unique normalized
 *   name). A resolved definition is reused without modification; a name-based
 *   match is opportunistically repaired by persisting `legacyKey` with OCC
 *   (repair failure only logs — the name fallback keeps the link working).
 * - **Creation uses friendly label-derived names**, deterministic UUIDv5 ids,
 *   and `legacyKey`; concurrent creators converge via the deterministic id.
 * - **Failures fail the configuration write.** Capacity, malformed linkage
 *   (duplicate `legacyKey`, type mismatch, unparseable YAML), and ambiguous
 *   matches throw a 400 — an orphaned inactive definition after a later
 *   configure OCC failure is safer than an active unlinked v1 field.
 *
 * Authorization: the configure create/update operations perform their authz
 * before calling this. Definition writes go through the unsecured SO client
 * (same as the migration task).
 */
export const ensureGlobalFieldDefinitions = async ({
  owner,
  spaceId,
  customFields,
  fieldDefinitionsService,
  logger,
}: {
  owner: string;
  spaceId: string;
  customFields: CustomFieldLike[] | null | undefined;
  fieldDefinitionsService: FieldDefinitionsService;
  logger: Logger;
}): Promise<void> => {
  if (!customFields?.length) {
    return;
  }

  // Read ALL definitions for the owner (not just isGlobal: true) so a definition
  // the user set to isGlobal: false is still detected and never duplicated.
  const existingSavedObjects = await fieldDefinitionsService.getFieldDefinitionSavedObjects(owner);
  const indexes = buildFieldLinkIndexes(existingSavedObjects);
  let totalCount = existingSavedObjects.length;

  const blockedFields: Array<{ key: string; reason: BlockedReason }> = [];

  const processCustomField = async (customField: CustomFieldLike): Promise<void> => {
    const resolution = resolveDefinitionForLegacyField(customField, indexes);

    if (resolution.status === 'malformed') {
      blockedFields.push({ key: customField.key, reason: resolution.reason });
      return;
    }

    if (resolution.status === 'unresolved' && resolution.reason === 'ambiguous_name_match') {
      blockedFields.push({ key: customField.key, reason: resolution.reason });
      return;
    }

    if (resolution.status === 'resolved') {
      const { definition } = resolution.link;

      if (!definition.isGlobal) {
        // The user intentionally set this to non-global via the field library —
        // reuse without overwriting that choice, but warn so the operator knows
        // the custom field will not automatically render on all cases.
        logger.warn(
          `Field definition "${definition.name}" (owner: "${owner}") is linked to custom ` +
            `field "${customField.key}" but is non-global — the custom field will not ` +
            `render as a global field.`
        );
      }

      if (resolution.needsLegacyKeyRepair) {
        await repairLegacyKey({
          fieldDefinitionsService,
          resolutionLink: resolution.link,
          legacyKey: customField.key,
          indexes,
          owner,
          logger,
        });
      }
      return;
    }

    // Unresolved with no match — a new linked definition is required.
    if (totalCount >= MAX_FIELD_DEFINITIONS_PER_OWNER) {
      blockedFields.push({ key: customField.key, reason: 'capacity' });
      return;
    }

    const result = await ensureLinkedFieldDefinition(customField, indexes, {
      spaceId,
      owner,
      createDefinition: async (attributes, id) =>
        fieldDefinitionsService.createFieldDefinition(
          {
            name: attributes.name,
            owner: attributes.owner,
            definition: attributes.definition,
            description: attributes.description,
            isGlobal: true,
          },
          { id, legacyKey: attributes.legacyKey }
        ),
      fetchDefinitionById: async (id) => {
        try {
          const so = await fieldDefinitionsService.getFieldDefinition(id);
          return so.attributes;
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
            return undefined;
          }
          throw error;
        }
      },
    });

    if (result.outcome === 'blocked') {
      blockedFields.push({ key: customField.key, reason: result.reason });
      return;
    }

    // Register in-loop so intra-request duplicate keys converge on one SO and
    // later friendly-name generation sees the new name (#282060 semantics).
    addDefinitionToIndexes(indexes, result.definition);
    if (result.outcome === 'created') {
      totalCount++;
    }
  };

  // Sequential by design: processCustomField mutates `indexes` so each iteration
  // sees definitions created or repaired by earlier ones (intra-request dedup).
  for (const customField of customFields) {
    await processCustomField(customField);
  }

  if (blockedFields.length > 0) {
    const details = blockedFields
      .map(({ key, reason }) => `"${key}" (${BLOCKED_REASON_DESCRIPTIONS[reason]})`)
      .join('; ');
    throw Boom.badRequest(
      `Cannot save the Cases configuration: the following custom fields could not be linked ` +
        `to a field definition: ${details}. Resolve the field library state and retry.`
    );
  }
};

/**
 * Persists `legacyKey` on a name-matched pre-friendly-name definition with
 * optimistic concurrency. A conflict (concurrent repair or metadata update)
 * only skips the repair — the name fallback keeps resolving the link, so this
 * never fails the configuration write.
 */
const repairLegacyKey = async ({
  fieldDefinitionsService,
  resolutionLink,
  legacyKey,
  indexes,
  owner,
  logger,
}: {
  fieldDefinitionsService: FieldDefinitionsService;
  resolutionLink: LinkableFieldDefinition;
  legacyKey: string;
  indexes: FieldLinkIndexes;
  owner: string;
  logger: Logger;
}): Promise<void> => {
  const { definition, version } = resolutionLink;
  try {
    await fieldDefinitionsService.setLegacyKey(definition.fieldDefinitionId, legacyKey, {
      version,
    });
    // Reflect the repaired link in-memory so a duplicate key later in this
    // request resolves through the exact legacyKey path.
    registerRepairedLegacyKey(indexes, resolutionLink, legacyKey);
  } catch (error) {
    const level = SavedObjectsErrorHelpers.isConflictError(error as Error) ? 'debug' : 'warn';
    logger[level](
      `Skipped legacyKey repair for field definition "${definition.name}" (owner: "${owner}"): ` +
        `${error instanceof Error ? error.message : String(error)}`
    );
  }
};
