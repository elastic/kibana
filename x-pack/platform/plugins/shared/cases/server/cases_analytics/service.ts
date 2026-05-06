/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Logger, SavedObject } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../common/constants';
import type { CasePersistedAttributes } from '../common/types/case';
import type { UserActionPersistedAttributes } from '../common/types/user_actions';
import { ensureCasesDataIndices } from './ensure_indices';
import { ensureCasesDataIlmPolicy } from './ilm/ensure_policy';
import { registerReconciliationTask, scheduleReconciliationTask } from './reconciliation';
import { CasesTemplateFieldsSyncService } from './template_fields_sync';
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
  isServerless: boolean;
}

/**
 * Top-level orchestrator for the cases-as-data subsystem.
 *
 * Lifecycle:
 *  - `setup()`  — registers the reconciliation task definition. Idempotent.
 *  - `start()`  — bootstraps the indices, instantiates the writer, schedules the
 *                 reconciliation task, starts the template-fields sync service.
 *
 * The single `getWriter()` accessor exposes the writer to the cases SO services
 * (via `CasesClientFactory`). When `config.enabled === false`, this returns the
 * NOOP_WRITER and `start()` is a no-op.
 */
export class CasesAnalyticsService {
  private readonly logger: Logger;
  private readonly config: CasesAnalyticsConfig;
  private writer: CasesAnalyticsWriterContract = NOOP_WRITER;
  private templateFieldsSync?: CasesTemplateFieldsSyncService;
  /** Resolved on `start()`; reconciliation task uses this to look up dependencies. */
  private startResolvers?: {
    coreStart: CoreStart;
    realWriter: CasesAnalyticsWriter;
  };

  constructor({ logger, config }: { logger: Logger; config: CasesAnalyticsConfig }) {
    this.logger = logger.get('cases.analytics');
    this.config = config;
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

  async start({ core, taskManager, isServerless }: StartArgs): Promise<void> {
    if (!this.config.enabled) return;

    const esClient = core.elasticsearch.client.asInternalUser;

    // Bootstrap (best-effort). Failures here log but do not abort start — the
    // reconciliation task is the durability backstop.
    await ensureCasesDataIlmPolicy({ esClient, logger: this.logger });
    await ensureCasesDataIndices({ esClient, logger: this.logger, isServerless });

    const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
      CASE_SAVED_OBJECT,
      CASE_USER_ACTION_SAVED_OBJECT,
    ]);

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

    this.templateFieldsSync = new CasesTemplateFieldsSyncService({ esClient, logger: this.logger });
    this.templateFieldsSync.start();

    await scheduleReconciliationTask({
      taskManager,
      logger: this.logger,
      intervalOverride: this.config.reconciliation.interval,
    });

    this.logger.info('cases-as-data writer + reconciliation started');
  }

  stop(): void {
    this.templateFieldsSync?.stop();
  }

  /**
   * Returns the active writer. When the feature is disabled (config flag false), this
   * returns a no-op writer so call sites need no `if` guard. The contract type is
   * intentionally narrow (only the four hook methods) so the SO services can't reach
   * for internals.
   */
  getWriter(): CasesAnalyticsWriterContract {
    return this.writer;
  }
}
