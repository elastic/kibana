/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  CASE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../common/constants';
import type { Template } from '../../common/types/domain/template/latest';
import type { CasePersistedAttributes } from '../common/types/case';
import type { UserActionPersistedAttributes } from '../common/types/user_actions';
import { CasesAnalyticsDataViewService } from './data_view/service';
import { ensureCasesDataIndices } from './ensure_indices';
import { ensureCasesDataIlmPolicy } from './ilm/ensure_policy';
import { registerReconciliationTask, scheduleReconciliationTask } from './reconciliation';
import { CasesAnalyticsWriter, NOOP_WRITER, type CasesAnalyticsWriterContract } from './writer';

export interface CasesAnalyticsConfig {
  enabled: boolean;
  reconciliation: {
    interval: string;
  };
  write: {
    max_retries: number;
    retry_initial_delay_ms: number;
  };
}

interface SetupArgs {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: CasesAnalyticsConfig;
}

interface StartArgs {
  core: CoreStart;
  taskManager: TaskManagerStartContract;
  dataViews: DataViewsServerPluginStart;
  isServerless: boolean;
}

/**
 * Hook surface exposed to the templates service (via CasesClientFactory) so
 * template create/update/delete events feed the data view sync. Stable proxy
 * pattern matches the writer — the real implementation is wired in `start()`,
 * but the contract object is constructed in the service constructor so call
 * sites can cache it without race conditions.
 */
export interface CasesAnalyticsTemplateHookContract {
  onTemplateChanged: (template: SavedObject<Template>) => void;
}

const NOOP_TEMPLATE_HOOK: CasesAnalyticsTemplateHookContract = {
  onTemplateChanged: () => {},
};

/**
 * Top-level orchestrator for the cases-as-data subsystem.
 *
 * Lifecycle:
 *  - `setup()`  — registers the reconciliation task definition. Idempotent.
 *  - `start()`  — instantiates the writer (synchronously, before any await),
 *                 then bootstraps the indices, schedules the reconciliation task,
 *                 starts the template-fields sync service.
 *
 * `getWriter()` returns a stable proxy that delegates to the live writer. The proxy
 * never changes identity after construction — the writer it forwards to does. This
 * guarantees that `CasesClientFactory` (which captures the writer at plugin start
 * time) always sees the latest writer, even though `start()` runs asynchronously.
 *
 * When `config.enabled === false`, `start()` is a no-op and the proxy keeps
 * delegating to NOOP_WRITER.
 */
export class CasesAnalyticsService {
  private readonly logger: Logger;
  private readonly config: CasesAnalyticsConfig;
  /**
   * The "live" writer reference. Mutated by `start()`. Never read directly by
   * external callers — they go through the proxy returned by `getWriter()`.
   */
  private writer: CasesAnalyticsWriterContract = NOOP_WRITER;
  /**
   * Stable proxy returned by `getWriter()`. Delegates every call to the current
   * `this.writer` at call time, so callers don't have to worry about late writer
   * initialization. Constructed once in the constructor; identity never changes.
   */
  private readonly writerProxy: CasesAnalyticsWriterContract;
  /**
   * Live data view service. Replaces the NOOP_TEMPLATE_HOOK once `start()`
   * runs. Same proxy pattern as the writer: callers cache the proxy and the
   * proxy delegates to whatever the live service is at call time.
   */
  private dataViewService?: CasesAnalyticsDataViewService;
  private readonly templateHookProxy: CasesAnalyticsTemplateHookContract;
  /** Resolved on `start()`; reconciliation task uses this to look up dependencies. */
  private startResolvers?: {
    coreStart: CoreStart;
    realWriter: CasesAnalyticsWriter;
  };

  constructor({ logger, config }: { logger: Logger; config: CasesAnalyticsConfig }) {
    this.logger = logger.get('cases.analytics');
    this.config = config;
    this.writerProxy = {
      upsertCase: (so) => this.writer.upsertCase(so),
      deleteCase: (id) => this.writer.deleteCase(id),
      appendActivity: (so) => this.writer.appendActivity(so),
      recomputeLifecycle: (id) => this.writer.recomputeLifecycle(id),
    };
    this.templateHookProxy = {
      onTemplateChanged: (template) => {
        (this.dataViewService ?? NOOP_TEMPLATE_HOOK).onTemplateChanged(template);
      },
    };
  }

  setup({ core, taskManager }: SetupArgs): void {
    if (!this.config.enabled) {
      this.logger.debug('cases-as-data disabled (xpack.cases.analytics.enabled=false)');
      return;
    }

    registerReconciliationTask({
      taskManager,
      logger: this.logger,
      resolveDeps: async () => {
        if (!this.startResolvers) {
          throw new Error(
            'cases.analytics: reconciliation task fired before start() — programmer error'
          );
        }
        return {
          core: this.startResolvers.coreStart,
          writer: this.startResolvers.realWriter,
        };
      },
    });
  }

  async start({ core, taskManager, dataViews, isServerless }: StartArgs): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info(
        'cases-as-data: disabled (xpack.cases.analytics.enabled=false); skipping start'
      );
      return;
    }

    const esClient = core.elasticsearch.client.asInternalUser;

    // Construct the writer SYNCHRONOUSLY first — before any `await` — so that the
    // proxy returned by `getWriter()` starts delegating to the real writer the
    // instant `start()` begins executing. CasesClientFactory.initialize() is called
    // from plugin.start() right after `void casesAnalyticsService.start()`, so any
    // awaits before this assignment would mean SO writes between the void call and
    // the first await still hit NOOP. Synchronous-first eliminates that window.
    const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
      CASE_SAVED_OBJECT,
      CASE_USER_ACTION_SAVED_OBJECT,
      CASE_TEMPLATE_SAVED_OBJECT,
    ]);
    const internalSavedObjectsClient =
      internalSavedObjectsRepository as unknown as SavedObjectsClientContract;

    const realWriter = new CasesAnalyticsWriter({
      esClient,
      logger: this.logger,
      maxRetries: this.config.write.max_retries,
      retryInitialDelayMs: this.config.write.retry_initial_delay_ms,
      fetchCase: async (caseId): Promise<SavedObject<CasePersistedAttributes> | null> => {
        try {
          return await internalSavedObjectsRepository.get<CasePersistedAttributes>(
            CASE_SAVED_OBJECT,
            caseId
          );
        } catch (err) {
          if (err?.output?.statusCode === 404) return null;
          throw err;
        }
      },
      fetchActivityForCase: async (
        caseId
      ): Promise<Array<SavedObject<UserActionPersistedAttributes>>> => {
        const res = await internalSavedObjectsRepository.find<UserActionPersistedAttributes>({
          type: CASE_USER_ACTION_SAVED_OBJECT,
          hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
          perPage: 1000,
          namespaces: ['*'],
          sortField: 'created_at',
          sortOrder: 'asc',
        });
        return res.saved_objects;
      },
    });

    this.writer = realWriter;
    this.startResolvers = { coreStart: core, realWriter };
    this.logger.info('cases-as-data: writer wired up (proxy now delegating to real writer)');

    // Bootstrap (best-effort). Failures here log but do not abort start — the
    // reconciliation task is the durability backstop. These run AFTER the writer is
    // wired so any case writes during bootstrap still go through the real writer
    // (and may fail if the index doesn't exist yet, which reconciliation backfills).
    await ensureCasesDataIlmPolicy({ esClient, logger: this.logger });
    await ensureCasesDataIndices({ esClient, logger: this.logger, isServerless });

    this.dataViewService = new CasesAnalyticsDataViewService({
      logger: this.logger,
      dataViewsService: dataViews,
      internalSavedObjectsClient,
      esClient,
    });
    // Bootstrap views + run an initial reconcile from existing templates.
    // Fire-and-forget; failures are logged inside the service.
    void this.dataViewService.start();

    await scheduleReconciliationTask({
      taskManager,
      logger: this.logger,
      intervalOverride: this.config.reconciliation.interval,
    });

    this.logger.info('cases-as-data: indices bootstrapped, reconciliation scheduled');
  }

  stop(): void {
    // No long-lived resources held by data view service yet.
  }

  /**
   * Returns a stable proxy that always delegates to the current writer. The proxy
   * is constructed once and its identity never changes, so callers (notably
   * `CasesClientFactory`) can capture this reference at start time without missing
   * the post-bootstrap writer transition.
   */
  getWriter(): CasesAnalyticsWriterContract {
    return this.writerProxy;
  }

  /**
   * Returns the template-write hook. Same stable-proxy pattern as `getWriter()` —
   * the templates service captures this reference at start time, and the proxy
   * delegates to the live data view service once `start()` has wired it up.
   */
  getTemplateHook(): CasesAnalyticsTemplateHookContract {
    return this.templateHookProxy;
  }
}
