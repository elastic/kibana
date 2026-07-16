/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { parse as parseYaml } from 'yaml';
import type { ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
} from '../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/v1';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import type { Template } from '../../../common/types/domain/template/v1';
import { toFieldDefinitions, trimFieldDefaults } from '../../services/templates/utils';
import { buildFieldDefinitionYaml } from './build_field_definition_yaml';
import { buildTemplateYaml } from './build_template_yaml';
import type { LegacyCustomField, LegacyTemplate, MigrationCounts } from './types';

/** Fetches every `cases-configure` SO across all spaces (there are only O(spaces) of them). */
export const findAllConfigurations = async (
  repo: ISavedObjectsRepository,
  log: Logger,
  executionId: string
): Promise<Array<SavedObject<ConfigurationPersistedAttributes>>> => {
  const all: Array<SavedObject<ConfigurationPersistedAttributes>> = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const result = await repo.find<ConfigurationPersistedAttributes>({
      type: CASE_CONFIGURE_SAVED_OBJECT,
      namespaces: ['*'],
      page,
      perPage,
      sortField: 'created_at',
      sortOrder: 'asc',
    });

    all.push(...result.saved_objects);

    if (result.saved_objects.length < perPage) {
      break;
    }
    page++;
  }

  log.debug(`[${executionId}] findAllConfigurations: fetched ${all.length} configure SOs`);

  return all;
};

/**
 * Creates a `cases-field-definition` SO (`isGlobal: true`) for each legacy custom field, keyed by the
 * legacy `key` so templates and cases can still reference it. An existing definition of the same name
 * is reused (a control/type mismatch is logged, not overwritten). Returns a legacy-key → ref-name map
 * for the template phase plus created/reused counts.
 */
const migrateFieldDefinitions = async (
  repo: ISavedObjectsRepository,
  owner: string,
  namespace: string,
  nsOption: string | undefined,
  legacyCustomFields: LegacyCustomField[],
  executionId: string,
  log: Logger
): Promise<{ refNamesByKey: Map<string, string>; created: number; reused: number }> => {
  const refNamesByKey = new Map<string, string>();
  let created = 0;
  let reused = 0;

  // perPage: 10000 is intentionally unbounded for this one-shot scan — field-definitions per owner
  // are expected to be O(10s).
  const existingFieldDefs = await repo.find<FieldDefinition>({
    type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
    namespaces: nsOption ? [nsOption] : ['default'],
    perPage: 10000,
    page: 1,
    // owner is one of cases/securitySolution/observability — a controlled enum, not user input
    filter: `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${owner}"`,
  });
  const existingByName = new Map(
    existingFieldDefs.saved_objects.map((fd) => [fd.attributes.name, fd])
  );

  for (const cf of legacyCustomFields) {
    const existingDef = existingByName.get(cf.key);
    if (existingDef) {
      const existingParsed = parseYaml(existingDef.attributes.definition ?? '') as Record<
        string,
        unknown
      >;
      const { yaml: expectedYaml } = buildFieldDefinitionYaml(cf);
      const expectedParsed = parseYaml(expectedYaml) as Record<string, unknown>;
      if (
        existingParsed?.control !== expectedParsed?.control ||
        existingParsed?.type !== expectedParsed?.type
      ) {
        log.warn(
          `[${executionId}] Field definition "${cf.key}" (owner: "${owner}", namespace: "${namespace}") already exists ` +
            `but has control="${existingParsed?.control}" / type="${existingParsed?.type}", ` +
            `expected control="${expectedParsed?.control}" / type="${expectedParsed?.type}" from legacy data — ` +
            `reusing existing; templates referencing this field may reference a type-mismatched definition`
        );
      } else {
        log.debug(
          `[${executionId}] Field definition "${cf.key}" already exists for owner "${owner}" in namespace "${namespace}" — reusing`
        );
      }
      refNamesByKey.set(cf.key, cf.key);
      reused++;
    } else {
      try {
        const { yaml } = buildFieldDefinitionYaml(cf);
        const fdId = uuidv4();
        await repo.create<FieldDefinition>(
          CASE_FIELD_DEFINITION_SAVED_OBJECT,
          {
            fieldDefinitionId: fdId,
            name: cf.key,
            owner,
            definition: yaml,
            description: cf.label,
            isGlobal: true,
          },
          { id: fdId, ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
        );
        refNamesByKey.set(cf.key, cf.key);
        created++;
      } catch (err) {
        log.error(
          `[${executionId}] Failed to create field definition for key "${
            cf.key
          }" (owner: ${owner}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return { refNamesByKey, created, reused };
};

/**
 * Creates a `cases-templates` SO for each legacy template, building its YAML definition (custom
 * fields become `$ref`s via `refNamesByKey`) and validating it before write. Templates whose name
 * already exists are skipped; an invalid or failed template is logged and skipped, not fatal.
 */
const migrateTemplates = async (
  repo: ISavedObjectsRepository,
  owner: string,
  namespace: string,
  nsOption: string | undefined,
  legacyTemplates: LegacyTemplate[],
  refNamesByKey: Map<string, string>,
  executionId: string,
  log: Logger
): Promise<{ created: number; reused: number }> => {
  let created = 0;
  let reused = 0;

  // perPage: 10000 is intentionally unbounded for this one-shot scan — templates per owner are
  // expected to be O(10s).
  const existingTemplates = await repo.find<Template>({
    type: CASE_TEMPLATE_SAVED_OBJECT,
    namespaces: nsOption ? [nsOption] : ['default'],
    perPage: 10000,
    page: 1,
    // owner is one of cases/securitySolution/observability — a controlled enum, not user input
    filter:
      `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.owner: "${owner}" AND ` +
      `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.isLatest: true`,
  });
  const existingNameSet = new Set(existingTemplates.saved_objects.map((t) => t.attributes.name));

  for (const legacyTemplate of legacyTemplates) {
    const templateName = legacyTemplate.name.trim();
    if (!templateName) {
      log.error(
        `[${executionId}] Skipping legacy template with empty name for owner "${owner}" in namespace "${namespace}"`
      );
    } else if (existingNameSet.has(templateName)) {
      log.debug(
        `[${executionId}] Template "${templateName}" already exists for owner "${owner}" in namespace "${namespace}" — reusing`
      );
      reused++;
    } else {
      const normalizedLegacyTemplate = {
        ...legacyTemplate,
        name: templateName,
      };
      try {
        const definition = trimFieldDefaults(
          buildTemplateYaml(normalizedLegacyTemplate, refNamesByKey, log)
        );
        const parseResult = ParsedTemplateDefinitionSchema.safeParse(parseYaml(definition));
        if (!parseResult.success) {
          throw new Error(
            `Template "${templateName}" produced an invalid definition: ${parseResult.error.message}`
          );
        }
        const parsedDefinition = parseResult.data;
        const templateId = uuidv4();
        const id = uuidv4();

        await repo.create<Template>(
          CASE_TEMPLATE_SAVED_OBJECT,
          {
            templateVersion: 1,
            isLatest: true,
            deletedAt: null,
            definition,
            // Template identity comes from legacy template metadata; case defaults live in YAML.
            name: templateName,
            owner,
            templateId,
            description: legacyTemplate.description,
            tags: legacyTemplate.tags,
            author: 'system',
            fieldCount: parsedDefinition.fields.length,
            fieldDefinitions: toFieldDefinitions(parsedDefinition.fields),
            isEnabled: true,
          } as Template,
          { id, ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
        );
        created++;
      } catch (err) {
        log.error(
          `[${executionId}] Failed to create template "${templateName}" (owner: ${owner}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  return { created, reused };
};

/**
 * Migrates one space's legacy field definitions and templates (each phase gated by its own
 * idempotency flag), then records those flags on the configure SO. The existing-case backfill is a
 * separate phase tracked by `legacyCasesMigrated`. Returns the created/reused counts for the run
 * summary.
 */
export const migrateOneConfigure = async (
  repo: ISavedObjectsRepository,
  so: SavedObject<ConfigurationPersistedAttributes>,
  executionId: string,
  log: Logger
): Promise<MigrationCounts> => {
  const { id: configureId, attributes, namespaces } = so;
  const {
    owner,
    customFields: legacyCustomFields = [],
    templates: legacyTemplates = [],
  } = attributes;
  const namespace = namespaces?.[0] ?? 'default';
  const nsOption = namespace === 'default' ? undefined : namespace;

  log.debug(
    `[${executionId}] Migrating configure SO ${configureId} (owner: ${owner}, namespace: ${namespace}, ` +
      `customFields: ${legacyCustomFields.length}, templates: ${legacyTemplates.length})`
  );

  // ── Field definitions phase ──────────────────────────────────────────────
  let fieldDefsCreated = 0;
  let fieldDefsReused = 0;
  let refNamesByKey = new Map<string, string>();

  if (!attributes.legacyCustomFieldsMigrated && legacyCustomFields.length > 0) {
    const result = await migrateFieldDefinitions(
      repo,
      owner,
      namespace,
      nsOption,
      legacyCustomFields,
      executionId,
      log
    );
    refNamesByKey = result.refNamesByKey;
    fieldDefsCreated = result.created;
    fieldDefsReused = result.reused;
  } else {
    // Already migrated or no custom fields — build the ref map from legacy keys for the template phase.
    for (const cf of legacyCustomFields) {
      refNamesByKey.set(cf.key, cf.key);
    }
  }

  // ── Templates phase ──────────────────────────────────────────────────────
  let templatesCreated = 0;
  let templatesReused = 0;

  if (!attributes.legacyTemplatesMigrated && legacyTemplates.length > 0) {
    const result = await migrateTemplates(
      repo,
      owner,
      namespace,
      nsOption,
      legacyTemplates,
      refNamesByKey,
      executionId,
      log
    );
    templatesCreated = result.created;
    templatesReused = result.reused;
  }

  // ── Write field-definition / template migration flags ────────────────────
  // Written together whenever the configure SO has any legacy data. Setting each flag even when its
  // array is empty at migration time prevents spurious re-runs. Configure SOs with no legacy data at
  // all receive no flags and are re-evaluated cheaply on each restart.
  const flagsToWrite: Partial<ConfigurationPersistedAttributes> = {};
  if (legacyCustomFields.length > 0 || legacyTemplates.length > 0) {
    if (!attributes.legacyCustomFieldsMigrated) {
      flagsToWrite.legacyCustomFieldsMigrated = true;
    }
    if (!attributes.legacyTemplatesMigrated) {
      flagsToWrite.legacyTemplatesMigrated = true;
    }
  }

  if (Object.keys(flagsToWrite).length > 0) {
    await repo.update<ConfigurationPersistedAttributes>(
      CASE_CONFIGURE_SAVED_OBJECT,
      configureId,
      flagsToWrite,
      { ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
    );
  }

  // Per-SO detail stays at debug — the run() loop aggregates these into a single summary INFO line.
  log.debug(
    `[${executionId}] Migrated configure SO ${configureId} (owner: ${owner}, namespace: ${namespace}): ` +
      `fieldDefsCreated=${fieldDefsCreated}, fieldDefsReused=${fieldDefsReused}, ` +
      `templatesCreated=${templatesCreated}, templatesReused=${templatesReused}`
  );

  return { fieldDefsCreated, fieldDefsReused, templatesCreated, templatesReused };
};
