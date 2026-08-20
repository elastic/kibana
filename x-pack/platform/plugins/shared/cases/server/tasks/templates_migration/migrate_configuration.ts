/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { parse as parseYaml } from 'yaml';
import type { ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/v1';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import type { Template } from '../../../common/types/domain/template/v1';
import { toFieldDefinitions, trimFieldDefaults } from '../../services/templates/utils';
import type {
  FieldLinkIndexes,
  LinkableFieldDefinition,
} from '../../common/utils/field_link_resolution';
import {
  addDefinitionToIndexes,
  buildFieldLinkIndexes,
  registerRepairedLegacyKey,
  resolveDefinitionForLegacyField,
} from '../../common/utils/field_link_resolution';
import { ensureLinkedFieldDefinition } from '../../common/utils/ensure_linked_field_definition';
import { buildTemplateYaml } from './build_template_yaml';
import type { LegacyCustomField, LegacyTemplate, MigrationCounts } from './types';

/**
 * Fetches every `cases-field-definition` SO for the given owner/namespace.
 * perPage: 10000 is intentionally unbounded for this one-shot scan — field-definitions per
 * owner are expected to be O(10s).
 */
export const findFieldDefinitionsForOwner = async (
  repo: ISavedObjectsRepository,
  owner: string,
  nsOption: string | undefined
): Promise<Array<SavedObject<FieldDefinition>>> => {
  const result = await repo.find<FieldDefinition>({
    type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
    namespaces: nsOption ? [nsOption] : ['default'],
    perPage: 10000,
    page: 1,
    // owner is one of cases/securitySolution/observability — a controlled enum, not user input
    filter: `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${owner}"`,
  });

  return result.saved_objects;
};

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
 * Ensures a linked `cases-field-definition` SO (`isGlobal: true`) exists for each legacy custom
 * field. Link resolution follows the field-identity plan (`legacyKey` → exact name → unique
 * normalized name); new definitions get friendly label-derived names, deterministic UUIDv5 ids,
 * and `legacyKey`, so a concurrent configure write converges on the same SO. Malformed or
 * ambiguous linkage is logged and skipped (the field is omitted from template `$ref` maps —
 * never guessed). Also enforces `MAX_FIELD_DEFINITIONS_PER_OWNER` — the same cap the live
 * configure path applies — so this one-shot backfill can't push an owner past it. Returns a
 * legacy-key → definition-name map for the template phase plus created/reused counts and
 * whether any *unexpected* error occurred (as opposed to an expected `blocked` skip), which
 * gates whether the caller may mark the phase migrated.
 */
const migrateFieldDefinitions = async (
  repo: ISavedObjectsRepository,
  owner: string,
  namespace: string,
  nsOption: string | undefined,
  legacyCustomFields: LegacyCustomField[],
  executionId: string,
  log: Logger
): Promise<{
  refNamesByKey: Map<string, string>;
  created: number;
  reused: number;
  libraryDefs: FieldDefinition[];
  hadUnexpectedError: boolean;
}> => {
  const refNamesByKey = new Map<string, string>();
  const libraryDefs: FieldDefinition[] = [];
  let created = 0;
  let reused = 0;
  let hadUnexpectedError = false;

  const existingFieldDefs = await findFieldDefinitionsForOwner(repo, owner, nsOption);
  const indexes = buildFieldLinkIndexes(existingFieldDefs);
  let totalCount = existingFieldDefs.length;

  const skippedKeys: string[] = [];

  for (const cf of legacyCustomFields) {
    try {
      // Mirrors the live configure path's pre-check (ensureLinkedFieldDefinition itself does
      // not enforce the cap): only a key with no existing link consumes a capacity slot.
      const preResolution = resolveDefinitionForLegacyField(cf, indexes);
      const capacityReached =
        preResolution.status === 'unresolved' &&
        preResolution.reason === 'no_match' &&
        totalCount >= MAX_FIELD_DEFINITIONS_PER_OWNER;

      if (capacityReached) {
        // Same cap the sub-client enforces at the API layer; the hook
        // (ensureGlobalFieldDefinitions) applies the identical guard. Skipped keys are
        // deliberately NOT added to refNamesByKey — buildTemplateYaml then omits them from
        // migrated templates with its own per-key warning.
        skippedKeys.push(cf.key);
        log.error(
          `[${executionId}] Skipping field definition for custom field "${cf.key}" ` +
            `(owner: "${owner}", namespace: "${namespace}"): the maximum of ` +
            `${MAX_FIELD_DEFINITIONS_PER_OWNER} field definitions per owner is reached`
        );
      } else {
        const result = await ensureLinkedFieldDefinition(cf, indexes, {
          spaceId: namespace,
          owner,
          createDefinition: async (attributes, id) =>
            repo.create<FieldDefinition>(CASE_FIELD_DEFINITION_SAVED_OBJECT, attributes, {
              id,
              ...(nsOption ? { namespace: nsOption } : {}),
              // Use 'wait_for' so a concurrent configure PATCH's find sees this definition
              // and avoids creating a duplicate. Field definitions per owner are O(10s) so
              // the per-document refresh cost is negligible for this one-shot task.
              refresh: 'wait_for',
            }),
          fetchDefinitionById: async (id) => {
            try {
              const so = await repo.get<FieldDefinition>(CASE_FIELD_DEFINITION_SAVED_OBJECT, id, {
                ...(nsOption ? { namespace: nsOption } : {}),
              });
              return so.attributes;
            } catch (err) {
              if (SavedObjectsErrorHelpers.isNotFoundError(err as Error)) {
                return undefined;
              }
              throw err;
            }
          },
        });

        if (result.outcome === 'blocked') {
          // Skipped, never guessed: templates referencing this key omit the field with a
          // warning (buildTemplateYaml), and the reconciliation phase re-reports it.
          log.error(
            `[${executionId}] Skipping field definition for custom field "${cf.key}" ` +
              `(owner: "${owner}", namespace: "${namespace}"): ${result.reason}`
          );
        } else {
          const { definition } = result;
          // A case-insensitive name-fallback match (needsLegacyKeyRepair) resolved because
          // cf.key and definition.name are already equal up to normalization — keep the raw
          // legacy key in the $ref so re-running migration on unchanged legacy data produces a
          // stable diff. Any other match (exact legacyKey, or a freshly created friendly name)
          // must use definition.name: that's the only name buildTemplateYaml's $ref can resolve
          // against libraryDefs.
          const refName =
            result.outcome === 'reused' && result.needsLegacyKeyRepair ? cf.key : definition.name;
          refNamesByKey.set(cf.key, refName);
          libraryDefs.push(definition);

          if (result.outcome === 'created' || result.link === undefined) {
            // A 'reused' outcome with no `link` converged on a concurrent creator's definition
            // (ensureLinkedFieldDefinition's conflict fallback) rather than one already present
            // in `existingFieldDefs` — that SO is genuinely new, so it must be registered and
            // counted here the same as an outright `created` outcome, or a later key in this
            // same run could push the owner past MAX_FIELD_DEFINITIONS_PER_OWNER uncounted.
            addDefinitionToIndexes(indexes, definition);
            totalCount++;
          }

          if (result.outcome === 'created') {
            created++;
          } else {
            reused++;
            if (result.needsLegacyKeyRepair && result.link !== undefined) {
              await repairLegacyKey({
                repo,
                nsOption,
                link: result.link,
                legacyKey: cf.key,
                indexes,
                executionId,
                log,
              });
            }
          }
        }
      }
    } catch (err) {
      hadUnexpectedError = true;
      log.error(
        `[${executionId}] Failed to ensure field definition for key "${
          cf.key
        }" (owner: ${owner}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (skippedKeys.length > 0) {
    // Skipped keys are deliberately NOT added to refNamesByKey — buildTemplateYaml then
    // omits them from migrated templates with its own per-key warning.
    log.warn(
      `[${executionId}] Reached the maximum of ${MAX_FIELD_DEFINITIONS_PER_OWNER} field ` +
        `definitions for owner "${owner}" in namespace "${namespace}" — the following legacy ` +
        `custom fields were not migrated: ${skippedKeys.join(', ')}`
    );
  }

  return {
    refNamesByKey,
    created,
    reused,
    libraryDefs,
    hadUnexpectedError,
  };
};

/**
 * Opportunistically persists `legacyKey` on a name-matched pre-friendly-name definition with
 * optimistic concurrency. A conflict means a concurrent writer (configure API or another node)
 * touched the SO — the repair is skipped, never retried or failed: the name fallback keeps the
 * link resolving.
 */
const repairLegacyKey = async ({
  repo,
  nsOption,
  link,
  legacyKey,
  indexes,
  executionId,
  log,
}: {
  repo: ISavedObjectsRepository;
  nsOption: string | undefined;
  link: LinkableFieldDefinition;
  legacyKey: string;
  indexes: FieldLinkIndexes;
  executionId: string;
  log: Logger;
}): Promise<void> => {
  const { definition, version } = link;
  try {
    await repo.update<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      definition.fieldDefinitionId,
      { legacyKey },
      {
        ...(nsOption ? { namespace: nsOption } : {}),
        ...(version !== undefined ? { version } : {}),
        refresh: false,
      }
    );
    registerRepairedLegacyKey(indexes, link, legacyKey);
  } catch (err) {
    const isConflict = SavedObjectsErrorHelpers.isConflictError(err as Error);
    const message = `[${executionId}] Skipped legacyKey repair for field definition "${
      definition.name
    }": ${err instanceof Error ? err.message : String(err)}`;
    if (isConflict) {
      log.debug(message);
    } else {
      log.warn(message);
    }
  }
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
  libraryDefs: readonly FieldDefinition[],
  executionId: string,
  log: Logger
): Promise<{ created: number; reused: number; hadUnexpectedError: boolean }> => {
  let created = 0;
  let reused = 0;
  let hadUnexpectedError = false;

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
            fieldDefinitions: toFieldDefinitions(parsedDefinition.fields, libraryDefs),
            isEnabled: true,
            // Preserve the v1 identity so a rule storing this legacy key resolves back to exactly
            // this migrated template, even when another v1 template shared the same name.
            legacyKey: legacyTemplate.key,
          } as Template,
          { id, ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
        );
        created++;
      } catch (err) {
        hadUnexpectedError = true;
        log.error(
          `[${executionId}] Failed to create template "${templateName}" (owner: ${owner}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  return { created, reused, hadUnexpectedError };
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
  let libraryDefs: FieldDefinition[] = [];
  // Only gates the migrated flag when the phase actually ran this run; an unexpected error
  // (as opposed to an expected per-field `blocked` skip) must not be masked as "done" so the
  // task manager retries the field on a later run instead of leaving it stuck forever.
  let fieldDefsHadError = false;

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
    libraryDefs = result.libraryDefs;
    fieldDefsHadError = result.hadUnexpectedError;
  } else if (legacyTemplates.length > 0 && legacyCustomFields.length > 0) {
    // Field definitions were migrated on an earlier run but templates still need the ref map
    // and library defs. Resolve each legacy key through the link indexes (a friendly-named
    // definition's name differs from the raw key); unresolvable keys are omitted so
    // buildTemplateYaml skips them with a warning instead of emitting a broken `$ref`.
    const existingFieldDefs = await findFieldDefinitionsForOwner(repo, owner, nsOption);
    libraryDefs = existingFieldDefs.map((fd) => fd.attributes);
    const indexes = buildFieldLinkIndexes(existingFieldDefs);
    for (const cf of legacyCustomFields) {
      const resolution = resolveDefinitionForLegacyField(cf, indexes);
      if (resolution.status === 'resolved') {
        // Same rationale as migrateFieldDefinitions: a name-fallback match keeps the raw
        // legacy key so re-running migration on unchanged legacy data is stable.
        refNamesByKey.set(
          cf.key,
          resolution.needsLegacyKeyRepair ? cf.key : resolution.link.definition.name
        );
      }
    }
  }

  // ── Templates phase ──────────────────────────────────────────────────────
  let templatesCreated = 0;
  let templatesReused = 0;
  let templatesHadError = false;

  if (!attributes.legacyTemplatesMigrated && legacyTemplates.length > 0) {
    const result = await migrateTemplates(
      repo,
      owner,
      namespace,
      nsOption,
      legacyTemplates,
      refNamesByKey,
      libraryDefs,
      executionId,
      log
    );
    templatesCreated = result.created;
    templatesReused = result.reused;
    templatesHadError = result.hadUnexpectedError;
  }

  // ── Write field-definition / template migration flags ────────────────────
  // Written together whenever the configure SO has any legacy data. Setting each flag even when its
  // array is empty at migration time prevents spurious re-runs. Configure SOs with no legacy data at
  // all receive no flags and are re-evaluated cheaply on each restart. A phase that hit an
  // unexpected error stays unflagged so the next run retries it instead of leaving the failed
  // item permanently unmigrated.
  //
  // legacyTemplatesMigrated additionally requires !fieldDefsHadError, but only when this configure
  // SO actually has templates to migrate: the templates phase consumes refNamesByKey/libraryDefs
  // produced by the field-definitions phase in this SAME run, so a field that failed with an
  // unexpected error this run leaves refNamesByKey missing its entry — a template write that
  // itself throws nothing has then silently omitted that field's $ref, and marking the phase
  // migrated would make that omission permanent. A configure SO with zero templates never
  // consumes refNamesByKey at all, so a field-def error elsewhere doesn't taint anything here.
  const flagsToWrite: Partial<ConfigurationPersistedAttributes> = {};
  if (legacyCustomFields.length > 0 || legacyTemplates.length > 0) {
    if (!attributes.legacyCustomFieldsMigrated && !fieldDefsHadError) {
      flagsToWrite.legacyCustomFieldsMigrated = true;
    }
    if (
      !attributes.legacyTemplatesMigrated &&
      !templatesHadError &&
      (legacyTemplates.length === 0 || !fieldDefsHadError)
    ) {
      flagsToWrite.legacyTemplatesMigrated = true;
    }
  }

  // Tracks the TRUE final state for the caller (see MigrationCounts doc): defaults to the
  // pre-run values, and is only promoted to `true` once the write below actually commits — a
  // conflicted write must not be reported as done.
  let finalLegacyCustomFieldsMigrated = attributes.legacyCustomFieldsMigrated === true;
  let finalLegacyTemplatesMigrated = attributes.legacyTemplatesMigrated === true;

  if (Object.keys(flagsToWrite).length > 0) {
    try {
      await repo.update<ConfigurationPersistedAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        configureId,
        flagsToWrite,
        {
          ...(nsOption ? { namespace: nsOption } : {}),
          version: so.version,
          refresh: false,
        }
      );
      if (flagsToWrite.legacyCustomFieldsMigrated) {
        finalLegacyCustomFieldsMigrated = true;
      }
      if (flagsToWrite.legacyTemplatesMigrated) {
        finalLegacyTemplatesMigrated = true;
      }
    } catch (err) {
      // A concurrent configure write (e.g. a user PATCH that added a template/custom field)
      // landed between the read at the top of this function and this write. Writing the
      // flags anyway would mark the *stale* snapshot as migrated and permanently skip
      // whatever the concurrent write added. Skip the flag write — the next run re-reads
      // the current SO and re-evaluates from scratch (already-linked fields/templates are
      // cheap no-ops via legacyKey/name reuse).
      if (SavedObjectsErrorHelpers.isConflictError(err as Error)) {
        log.debug(
          `[${executionId}] Configure SO ${configureId} changed concurrently — skipping ` +
            `migration flag write this run; will re-evaluate on the next run`
        );
      } else {
        throw err;
      }
    }
  }

  // Per-SO detail stays at debug — the run() loop aggregates these into a single summary INFO line.
  log.debug(
    `[${executionId}] Migrated configure SO ${configureId} (owner: ${owner}, namespace: ${namespace}): ` +
      `fieldDefsCreated=${fieldDefsCreated}, fieldDefsReused=${fieldDefsReused}, ` +
      `templatesCreated=${templatesCreated}, templatesReused=${templatesReused}`
  );

  return {
    fieldDefsCreated,
    fieldDefsReused,
    templatesCreated,
    templatesReused,
    legacyCustomFieldsMigrated: finalLegacyCustomFieldsMigrated,
    legacyTemplatesMigrated: finalLegacyTemplatesMigrated,
  };
};
