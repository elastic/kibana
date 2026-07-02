/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { parse as parseYaml } from 'yaml';
import pMap from 'p-map';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { CoreStart, ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  RunContext,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/v1';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import type { Template } from '../../../common/types/domain/template/v1';
import { toFieldNames, trimFieldDefaults } from '../../services/templates/utils';
import { buildFieldDefinitionYaml } from './build_field_definition_yaml';
import { buildTemplateYaml } from './build_template_yaml';
import { buildExtendedFieldsBackfill } from './build_case_extended_fields';
import {
  CASES_TEMPLATES_MIGRATION_TASK_TYPE,
  CASES_TEMPLATES_MIGRATION_TASK_ID,
} from './constants';

const MAX_CONCURRENT_MIGRATIONS = 3;

type LegacyCustomField = NonNullable<ConfigurationPersistedAttributes['customFields']>[number];
type LegacyTemplate = NonNullable<ConfigurationPersistedAttributes['templates']>[number];

// Case backfill scans an unbounded number of cases, so it uses a Point-In-Time cursor rather than
// from/size pagination (which fails past index.max_result_window, ~10k). Each task run scans at most
// CASE_BACKFILL_SCAN_BUDGET cases and then reschedules, persisting its cursor in task state, so a
// space with millions of cases completes across many short runs instead of one that times out.
const CASE_BACKFILL_PAGE_SIZE = 1000;
const CASE_BACKFILL_SCAN_BUDGET = 25000;
const CASE_BACKFILL_PIT_KEEP_ALIVE = '5m';
const CASE_BACKFILL_RESCHEDULE_DELAY_MS = 3000;

interface MigrationCounts {
  fieldDefsCreated: number;
  fieldDefsReused: number;
  templatesCreated: number;
  templatesReused: number;
}

/**
 * Cross-run cursor for the existing-case backfill. Persisted in Task Manager `state` so a run that
 * hits its scan budget (or is cancelled) resumes exactly where it left off, without re-writing cases
 * already backfilled. `pitId` + `searchAfter` are an Elasticsearch Point-In-Time cursor.
 */
interface CaseBackfillCursor {
  configureId: string;
  owner: string;
  namespace: string;
  nsOption?: string;
  pitId: string;
  searchAfter?: SortResults;
}

interface MigrationTaskState {
  caseBackfill?: CaseBackfillCursor;
}

interface SpaceBackfillResult {
  complete: boolean;
  scanned: number;
  backfilled: number;
  cursor?: CaseBackfillCursor;
}

export class TemplatesMigrationTaskManager {
  private readonly logger: Logger;
  private internalRepo?: ISavedObjectsRepository;
  private migrationUsageCounter?: IUsageCounter;

  constructor(
    taskManager: TaskManagerSetupContract,
    logger: Logger,
    usageCollection?: UsageCollectionSetup
  ) {
    this.logger = logger.get('cases_templates_v2_migration');
    this.logger.info('Registering Cases Templates V2 Migration Task');

    if (usageCollection) {
      this.migrationUsageCounter = usageCollection.createUsageCounter('CasesTemplatesV2Migration');
    }

    taskManager.registerTaskDefinitions({
      [CASES_TEMPLATES_MIGRATION_TASK_TYPE]: {
        title: 'Cases Templates V2 Migration',
        description: 'One-shot migration of legacy templates and custom fields to the v2 system',
        timeout: '10m',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance, abortController }: RunContext) => {
          // Same guard as IncrementalIdTaskManager: if Task Manager fires between setup() and
          // start(), we throw and let TM mark the run as failed — it will retry on next startup.
          if (!this.internalRepo) {
            throw new Error('TemplatesMigrationTaskManager: internal repository not initialized');
          }
          const repo = this.internalRepo;
          const log = this.logger;
          const previousState = (taskInstance?.state ?? {}) as MigrationTaskState;
          // Task Manager aborts this signal on timeout/cancel; we check it between scan pages and
          // persist the cursor so the next run resumes rather than running past the timeout.
          const signal = abortController?.signal ?? new AbortController().signal;

          return {
            run: async () => {
              const executionId = uuidv4();
              log.debug(`[${executionId}] Starting cases templates v2 migration`);

              const configures = await this.findAllConfigurations(repo, executionId);
              log.debug(
                `[${executionId}] Found ${configures.length} cases-configure SOs to inspect`
              );

              // Aggregate counters so the whole run produces a single summary INFO line instead of
              // one per space — keeping the server logs readable on large multi-space deployments.
              const totals = {
                skipped: 0,
                migrated: 0,
                errored: 0,
                fieldDefsCreated: 0,
                fieldDefsReused: 0,
                templatesCreated: 0,
                templatesReused: 0,
              };

              // ── Field definitions + templates phase (fast, bounded per space) ──────────────────
              await pMap(
                configures,
                async (so) => {
                  const fieldsAndTemplatesDone =
                    so.attributes.legacyTemplatesMigrated &&
                    so.attributes.legacyCustomFieldsMigrated;

                  if (fieldsAndTemplatesDone) {
                    if (so.attributes.legacyCasesMigrated) {
                      totals.skipped++;
                      this.migrationUsageCounter?.incrementCounter({
                        counterName: 'configureMigrationSkipped',
                        incrementBy: 1,
                      });
                    }
                    return;
                  }

                  try {
                    const counts = await this.migrateOneConfigure(repo, so, executionId, log);
                    totals.migrated++;
                    totals.fieldDefsCreated += counts.fieldDefsCreated;
                    totals.fieldDefsReused += counts.fieldDefsReused;
                    totals.templatesCreated += counts.templatesCreated;
                    totals.templatesReused += counts.templatesReused;
                    this.migrationUsageCounter?.incrementCounter({
                      counterName: 'configureMigrationSuccess',
                      incrementBy: 1,
                    });
                  } catch (err) {
                    totals.errored++;
                    // Per-SO failures stay at error level — they are rare and actionable.
                    log.error(
                      `[${executionId}] Migration failed for configure SO ${so.id} (owner: ${
                        so.attributes.owner
                      }): ${err instanceof Error ? err.message : String(err)}`
                    );
                    this.migrationUsageCounter?.incrementCounter({
                      counterName: 'configureMigrationError',
                      incrementBy: 1,
                    });
                  }
                },
                { concurrency: MAX_CONCURRENT_MIGRATIONS }
              );

              // ── Existing-case backfill phase (resumable, budgeted across runs) ─────────────────
              const backfill = await this.runCaseBackfillPhase(
                repo,
                configures,
                previousState.caseBackfill,
                signal,
                executionId,
                log
              );

              log.info(
                `[${executionId}] Cases templates v2 migration run complete: ` +
                  `${configures.length} configure SOs inspected ` +
                  `(fieldsAndTemplates migrated=${totals.migrated}, skipped=${totals.skipped}, errored=${totals.errored}); ` +
                  `field definitions created=${totals.fieldDefsCreated}, reused=${totals.fieldDefsReused}; ` +
                  `templates created=${totals.templatesCreated}, reused=${totals.templatesReused}; ` +
                  `cases backfilled this run=${backfill.backfilled}` +
                  `${backfill.complete ? '' : ' (more cases remain — rescheduling)'}`
              );

              // While the backfill is incomplete, self-reschedule and persist the cursor so a large
              // deployment finishes across many short runs instead of one that times out. When
              // complete, delete this one-shot task.
              if (!backfill.complete) {
                const nextState: Record<string, unknown> = backfill.nextCursor
                  ? { caseBackfill: backfill.nextCursor }
                  : {};
                return {
                  state: nextState,
                  runAt: new Date(Date.now() + CASE_BACKFILL_RESCHEDULE_DELAY_MS),
                };
              }

              return { state: {}, shouldDeleteTask: true };
            },

            cancel: async () => {
              log.debug('Cases templates v2 migration task cancelled — aborting scan');
              abortController?.abort();
            },
          };
        },
      },
    });
  }

  public async scheduleMigrationTask(
    taskManager: TaskManagerStartContract,
    core: CoreStart
  ): Promise<void> {
    this.internalRepo = core.savedObjects.createInternalRepository([
      CASE_CONFIGURE_SAVED_OBJECT,
      CASE_TEMPLATE_SAVED_OBJECT,
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      CASE_SAVED_OBJECT,
    ]);

    // Remove any lingering task record so the migration re-runs on every Kibana startup.
    // Each configure SO's own legacyCustomFieldsMigrated / legacyTemplatesMigrated flags
    // make individual phases idempotent — already-migrated SOs are cheap no-ops.
    //
    // Multi-node note: in a rolling restart, a second node may call removeIfExists while
    // the task is still executing on another node. TaskStore.remove on a locked task is a
    // best-effort delete; if interrupted mid-run the next startup will re-process the
    // partially-migrated SO (the per-SO flags prevent double-creation of already-written SOs).
    await taskManager.removeIfExists(CASES_TEMPLATES_MIGRATION_TASK_ID);

    try {
      await taskManager.ensureScheduled({
        id: CASES_TEMPLATES_MIGRATION_TASK_ID,
        taskType: CASES_TEMPLATES_MIGRATION_TASK_TYPE,
        params: {},
        state: {},
        scope: ['cases'],
      });
      this.logger.info(`${CASES_TEMPLATES_MIGRATION_TASK_ID} scheduled`);
    } catch (err) {
      this.logger.error(
        `Failed to schedule ${CASES_TEMPLATES_MIGRATION_TASK_ID}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  private async findAllConfigurations(
    repo: ISavedObjectsRepository,
    executionId: string
  ): Promise<Array<SavedObject<ConfigurationPersistedAttributes>>> {
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

    this.logger.debug(
      `[${executionId}] findAllConfigurations: fetched ${all.length} configure SOs`
    );

    return all;
  }

  private async migrateFieldDefinitions(
    repo: ISavedObjectsRepository,
    owner: string,
    namespace: string,
    nsOption: string | undefined,
    legacyCustomFields: LegacyCustomField[],
    executionId: string,
    log: Logger
  ): Promise<{ refNamesByKey: Map<string, string>; created: number; reused: number }> {
    const refNamesByKey = new Map<string, string>();
    let created = 0;
    let reused = 0;

    // perPage: 10000 is intentionally unbounded for this one-shot migration scan.
    // The number of field-definitions per owner is expected to be O(10s) in practice.
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
  }

  private async migrateTemplates(
    repo: ISavedObjectsRepository,
    owner: string,
    namespace: string,
    nsOption: string | undefined,
    legacyTemplates: LegacyTemplate[],
    refNamesByKey: Map<string, string>,
    executionId: string,
    log: Logger
  ): Promise<{ created: number; reused: number }> {
    let created = 0;
    let reused = 0;

    // perPage: 10000 is intentionally unbounded for this one-shot migration scan.
    // The number of templates per owner is expected to be O(10s) in practice.
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
      if (existingNameSet.has(legacyTemplate.name)) {
        log.debug(
          `[${executionId}] Template "${legacyTemplate.name}" already exists for owner "${owner}" in namespace "${namespace}" — reusing`
        );
        reused++;
      } else {
        try {
          const definition = trimFieldDefaults(
            buildTemplateYaml(legacyTemplate, refNamesByKey, log)
          );
          const parseResult = ParsedTemplateDefinitionSchema.safeParse(parseYaml(definition));
          if (!parseResult.success) {
            throw new Error(
              `Template "${legacyTemplate.name}" produced an invalid definition: ${parseResult.error.message}`
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
              name: parsedDefinition.name,
              owner,
              templateId,
              description: parsedDefinition.description ?? legacyTemplate.description,
              tags: parsedDefinition.tags ?? legacyTemplate.tags,
              author: 'system',
              fieldCount: parsedDefinition.fields.length,
              fieldNames: toFieldNames(parsedDefinition.fields),
              isEnabled: true,
            } as Template,
            { id, ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
          );
          created++;
        } catch (err) {
          log.error(
            `[${executionId}] Failed to create template "${
              legacyTemplate.name
            }" (owner: ${owner}): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    return { created, reused };
  }

  private async migrateOneConfigure(
    repo: ISavedObjectsRepository,
    so: SavedObject<ConfigurationPersistedAttributes>,
    executionId: string,
    log: Logger
  ): Promise<MigrationCounts> {
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
      const result = await this.migrateFieldDefinitions(
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
      // Already migrated or no custom fields — build refMap from legacy keys for template phase
      for (const cf of legacyCustomFields) {
        refNamesByKey.set(cf.key, cf.key);
      }
    }

    // ── Templates phase ──────────────────────────────────────────────────────
    let templatesCreated = 0;
    let templatesReused = 0;

    if (!attributes.legacyTemplatesMigrated && legacyTemplates.length > 0) {
      const result = await this.migrateTemplates(
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
    // array is empty at migration time prevents spurious re-runs. The existing-case backfill is
    // tracked separately (legacyCasesMigrated) by the resumable case-backfill phase. Configure SOs
    // with no legacy data at all receive no flags and are re-evaluated cheaply on each restart.
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

    // Per-SO detail is logged at debug only — the run() loop aggregates these into a single
    // summary INFO line so a deployment with many spaces doesn't flood the logs.
    log.debug(
      `[${executionId}] Migrated configure SO ${configureId} (owner: ${owner}, namespace: ${namespace}): ` +
        `fieldDefsCreated=${fieldDefsCreated}, fieldDefsReused=${fieldDefsReused}, ` +
        `templatesCreated=${templatesCreated}, templatesReused=${templatesReused}`
    );

    return { fieldDefsCreated, fieldDefsReused, templatesCreated, templatesReused };
  }

  /**
   * Resumable existing-case backfill phase. Walks the spaces still needing a backfill
   * (customFields configured AND legacyCasesMigrated not yet set), scanning at most
   * CASE_BACKFILL_SCAN_BUDGET cases across this run. Returns whether every pending space finished;
   * if not, `nextCursor` is where the next run should resume.
   */
  private async runCaseBackfillPhase(
    repo: ISavedObjectsRepository,
    configures: Array<SavedObject<ConfigurationPersistedAttributes>>,
    resumeCursor: CaseBackfillCursor | undefined,
    signal: AbortSignal,
    executionId: string,
    log: Logger
  ): Promise<{ complete: boolean; backfilled: number; nextCursor?: CaseBackfillCursor }> {
    const pending = configures.filter(
      (so) => (so.attributes.customFields?.length ?? 0) > 0 && !so.attributes.legacyCasesMigrated
    );

    if (pending.length === 0) {
      return { complete: true, backfilled: 0 };
    }

    // Resume the cursor's space first if it is still pending; otherwise it was already completed and
    // the cursor is stale, so drop it and start from the first pending space.
    let ordered = pending;
    let cursor = resumeCursor;
    if (cursor) {
      const resumeConfigureId = cursor.configureId;
      const idx = pending.findIndex((so) => so.id === resumeConfigureId);
      if (idx > 0) {
        ordered = [pending[idx], ...pending.slice(0, idx), ...pending.slice(idx + 1)];
      } else if (idx < 0) {
        cursor = undefined;
      }
    }

    let scannedThisRun = 0;
    let backfilled = 0;

    for (const so of ordered) {
      if (signal.aborted) {
        return { complete: false, backfilled, nextCursor: undefined };
      }

      const budgetLeft = CASE_BACKFILL_SCAN_BUDGET - scannedThisRun;
      if (budgetLeft <= 0) {
        // Budget spent between spaces — reschedule to continue with the next space on a fresh run.
        return { complete: false, backfilled, nextCursor: undefined };
      }

      const cursorForSpace = cursor?.configureId === so.id ? cursor : undefined;
      cursor = undefined; // the resume cursor only applies to its own space

      const result = await this.backfillCasesForSpace(
        repo,
        so,
        cursorForSpace,
        budgetLeft,
        signal,
        executionId,
        log
      );
      scannedThisRun += result.scanned;
      backfilled += result.backfilled;

      if (!result.complete) {
        // Budget hit, aborted, or a page had failures — stop here and reschedule with whatever cursor
        // the space returned (see below). The remaining spaces are picked up on the next run.
        return { complete: false, backfilled, nextCursor: result.cursor };
      }

      await this.setCasesMigratedFlag(repo, so, log);
    }

    return { complete: true, backfilled };
  }

  /**
   * Backfills one space's cases using an Elasticsearch Point-In-Time cursor (skip-safe, and not
   * subject to the from/size result-window limit that breaks past ~10k docs). Stops when the space
   * is exhausted, the per-run scan budget is hit, or the task is cancelled.
   */
  private async backfillCasesForSpace(
    repo: ISavedObjectsRepository,
    so: SavedObject<ConfigurationPersistedAttributes>,
    resumeCursor: CaseBackfillCursor | undefined,
    scanBudget: number,
    signal: AbortSignal,
    executionId: string,
    log: Logger
  ): Promise<SpaceBackfillResult> {
    const { owner } = so.attributes;
    const namespace = so.namespaces?.[0] ?? 'default';
    const nsOption = namespace === 'default' ? undefined : namespace;
    const namespaces = nsOption ? [nsOption] : ['default'];
    const filter = `${CASE_SAVED_OBJECT}.attributes.owner: "${owner}"`;

    const openPit = async () =>
      (
        await repo.openPointInTimeForType(CASE_SAVED_OBJECT, {
          namespaces,
          keepAlive: CASE_BACKFILL_PIT_KEEP_ALIVE,
        })
      ).id;

    // The cursor is advanced across awaits inside a strictly sequential scan loop (one page at a
    // time, no concurrent access), so require-atomic-updates is a false positive here.
    /* eslint-disable require-atomic-updates */
    const cursor: { pitId: string; searchAfter?: SortResults; reopenedStalePit: boolean } = {
      pitId: resumeCursor?.pitId ?? (await openPit()),
      searchAfter: resumeCursor?.pitId ? resumeCursor.searchAfter : undefined,
      reopenedStalePit: false,
    };
    let scanned = 0;
    let backfilled = 0;
    let hadFailures = false;

    const makeCursor = (): CaseBackfillCursor => ({
      configureId: so.id,
      owner,
      namespace,
      nsOption,
      pitId: cursor.pitId,
      searchAfter: cursor.searchAfter,
    });

    // Fetches one page, transparently reopening the PIT once if a resumed one has expired. Restarting
    // the scan is safe because the backfill only fills missing keys (already-done cases are skipped).
    const fetchPage = async () => {
      const findPage = () =>
        repo.find<CasePersistedAttributes>({
          type: CASE_SAVED_OBJECT,
          perPage: CASE_BACKFILL_PAGE_SIZE,
          sortField: 'created_at',
          sortOrder: 'asc',
          pit: { id: cursor.pitId, keepAlive: CASE_BACKFILL_PIT_KEEP_ALIVE },
          ...(cursor.searchAfter ? { searchAfter: cursor.searchAfter } : {}),
          filter,
        });

      try {
        return await findPage();
      } catch (err) {
        if (cursor.reopenedStalePit) {
          await this.safeClosePit(repo, cursor.pitId, log);
          throw err;
        }
        cursor.reopenedStalePit = true;
        log.warn(
          `[${executionId}] Case-backfill PIT invalid for owner "${owner}" (namespace: ${namespace}); reopening and rescanning the space`
        );
        cursor.pitId = await openPit();
        cursor.searchAfter = undefined;
        return findPage();
      }
    };

    while (true) {
      if (signal.aborted) {
        return { complete: false, scanned, backfilled, cursor: makeCursor() };
      }

      const page = await fetchPage();
      cursor.pitId = page.pit_id ?? cursor.pitId;
      const cases = page.saved_objects;
      scanned += cases.length;

      const updates = cases.flatMap((caseSO) => {
        const additions = buildExtendedFieldsBackfill(
          caseSO.attributes.customFields,
          caseSO.attributes.extended_fields
        );
        if (Object.keys(additions).length === 0) {
          return [];
        }
        return [
          {
            type: CASE_SAVED_OBJECT,
            id: caseSO.id,
            attributes: {
              extended_fields: { ...(caseSO.attributes.extended_fields ?? {}), ...additions },
            },
            ...(nsOption ? { namespace: nsOption } : {}),
          },
        ];
      });

      if (updates.length > 0) {
        const res = await repo.bulkUpdate<CasePersistedAttributes>(updates, { refresh: false });
        const failed = res.saved_objects.filter((s) => s.error != null);
        if (failed.length > 0) {
          hadFailures = true;
          log.error(
            `[${executionId}] ${failed.length}/${updates.length} case extended_fields updates failed for owner "${owner}" (namespace: ${namespace}); the space will be retried on a later run`
          );
        }
        backfilled += updates.length - failed.length;
      }

      const lastSort = cases[cases.length - 1]?.sort;
      if (lastSort) {
        cursor.searchAfter = lastSort;
      }

      // Exhausted this space's cases.
      if (cases.length < CASE_BACKFILL_PAGE_SIZE) {
        await this.safeClosePit(repo, cursor.pitId, log);
        // Only mark complete when nothing failed; otherwise reschedule for a fresh, idempotent retry.
        return { complete: !hadFailures, scanned, backfilled, cursor: undefined };
      }

      // Per-run scan budget hit — reschedule. If a page failed, restart the space next run (drop the
      // cursor) so the failed cases are revisited; otherwise resume forward from the PIT cursor.
      if (scanned >= scanBudget) {
        if (hadFailures) {
          await this.safeClosePit(repo, cursor.pitId, log);
          return { complete: false, scanned, backfilled, cursor: undefined };
        }
        return { complete: false, scanned, backfilled, cursor: makeCursor() };
      }
    }
    /* eslint-enable require-atomic-updates */
  }

  private async setCasesMigratedFlag(
    repo: ISavedObjectsRepository,
    so: SavedObject<ConfigurationPersistedAttributes>,
    log: Logger
  ): Promise<void> {
    if (so.attributes.legacyCasesMigrated) {
      return;
    }
    const namespace = so.namespaces?.[0] ?? 'default';
    const nsOption = namespace === 'default' ? undefined : namespace;
    await repo.update<ConfigurationPersistedAttributes>(
      CASE_CONFIGURE_SAVED_OBJECT,
      so.id,
      { legacyCasesMigrated: true },
      { ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
    );
  }

  private async safeClosePit(
    repo: ISavedObjectsRepository,
    pitId: string,
    log: Logger
  ): Promise<void> {
    try {
      await repo.closePointInTime(pitId);
    } catch (err) {
      // A PIT that cannot be closed (already expired) is harmless — it lapses on its own.
      log.debug(
        `Failed to close case-backfill PIT: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
