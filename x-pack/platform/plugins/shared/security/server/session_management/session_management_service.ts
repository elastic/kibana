/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs';

import type { HttpServiceSetup, IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { Session, type SessionOptions } from './session';
import { SessionCookie } from './session_cookie';
import { SessionIndex } from './session_index';
import type { ConfigType } from '../config';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
import { createOnlineStatusTaskRunner } from '../elasticsearch';

export interface SessionManagementServiceSetupParams {
  readonly http: Pick<HttpServiceSetup, 'basePath' | 'createCookieSessionStorageFactory'>;
  readonly config: ConfigType;
  readonly taskManager: TaskManagerSetupContract;
}

export interface SessionManagementServiceStartParams {
  readonly clusterClient: IClusterClient;
  readonly getTenantCrypto?: SessionOptions['getTenantCrypto'];
  readonly kibanaIndexName: string;
  readonly online$: Observable<OnlineStatusRetryScheduler>;
  readonly taskManager: TaskManagerStartContract;
  readonly audit: AuditServiceSetup;
}

export interface SessionManagementServiceStart {
  readonly session: Session;
}

/**
 * Name of the task that is periodically run and performs session index cleanup.
 */
export const SESSION_INDEX_CLEANUP_TASK_NAME = 'session_cleanup';

/**
 * Service responsible for the user session management.
 */
export class SessionManagementService {
  private statusSubscription?: Subscription;
  private sessionIndex!: SessionIndex;
  private readonly tenantSessionIndices = new Map<string, SessionIndex>();
  private sessionCookie!: SessionCookie;
  private config!: ConfigType;
  private isCleanupTaskScheduled = false;

  constructor(private readonly logger: Logger) {}

  setup({ config, http, taskManager }: SessionManagementServiceSetupParams) {
    this.config = config;

    this.sessionCookie = new SessionCookie({
      config,
      createCookieSessionStorageFactory: http.createCookieSessionStorageFactory,
      serverBasePath: http.basePath.serverBasePath || '/',
      logger: this.logger.get('cookie'),
    });

    // Register task that will perform periodic session index cleanup.
    taskManager.registerTaskDefinitions({
      [SESSION_INDEX_CLEANUP_TASK_NAME]: {
        title: 'Cleanup expired or invalid user sessions',
        createTaskRunner: (context) => ({
          run: async () => {
            await this.cleanUpTenantSessionIndices(context);
            return this.sessionIndex.cleanUp(context);
          },
        }),
      },
    });
  }

  start({
    clusterClient,
    getTenantCrypto,
    kibanaIndexName,
    online$,
    taskManager,
    audit,
  }: SessionManagementServiceStartParams): SessionManagementServiceStart {
    this.sessionIndex = new SessionIndex({
      config: this.config,
      elasticsearchClient: clusterClient.asInternalUser,
      kibanaIndexName,
      logger: this.logger.get('index'),
      auditLogger: audit.withoutRequest,
    });

    // Sessions of a tenant are stored in that tenant's cluster. Its index is created on first use.
    const getSessionIndex = (request: KibanaRequest) => {
      const { tenantId } = request;
      if (tenantId === undefined) {
        return this.sessionIndex;
      }

      let sessionIndex = this.tenantSessionIndices.get(tenantId);
      if (!sessionIndex) {
        sessionIndex = new SessionIndex({
          config: this.config,
          elasticsearchClient: clusterClient.asScoped(request).asInternalUser,
          kibanaIndexName,
          logger: this.logger.get('index', tenantId),
          auditLogger: audit.withoutRequest,
        });
        this.tenantSessionIndices.set(tenantId, sessionIndex);
      }
      return sessionIndex;
    };

    this.statusSubscription = online$
      .pipe(
        switchMap(
          createOnlineStatusTaskRunner(async () => {
            // Initialize the index first so the session index and its shards are fully ready
            // before the cleanup task is registered. Task Manager fires newly created tasks
            // immediately, so registering before initialization completes would cause the
            // cleanup task to open a PIT on an index whose shards may not yet be available,
            // resulting in 503 errors on first-ever project bootstrap.
            await this.sessionIndex.initialize();
            await this.scheduleCleanupTask(taskManager);
          })
        )
      )
      .subscribe();

    return {
      session: new Session({
        logger: this.logger,
        sessionCookie: this.sessionCookie,
        getSessionIndex,
        getTenantCrypto,
        config: this.config,
        audit,
      }),
    };
  }

  stop() {
    if (this.statusSubscription !== undefined) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = undefined;
    }
  }

  /**
   * Cleans up the session indices of tenants. Only tenants that this Kibana instance served since it started are
   * known here, and each one gets its own task state so a missing shard in one tenant doesn't affect the others.
   */
  private async cleanUpTenantSessionIndices(context: RunContext) {
    for (const [tenantId, sessionIndex] of this.tenantSessionIndices) {
      try {
        await sessionIndex.cleanUp({
          ...context,
          taskInstance: { ...context.taskInstance, state: {} },
        });
      } catch (err) {
        this.logger.error(`Failed to clean up sessions of tenant [${tenantId}]: ${err.message}`);
      }
    }
  }

  private async scheduleCleanupTask(taskManager: TaskManagerStartContract) {
    let currentTask;
    try {
      currentTask = await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME);
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        this.logger.error(`Failed to retrieve session index cleanup task: ${err.message}`);
        throw err;
      }

      this.logger.debug('Session index cleanup task is not scheduled yet.');
    }

    // Check if currently scheduled task is scheduled with the correct interval.
    const cleanupInterval = `${this.config.session.cleanupInterval.asSeconds()}s`;
    if (currentTask) {
      if (currentTask.schedule?.interval === cleanupInterval) {
        this.logger.debug('Session index cleanup task is already scheduled.');
        return;
      }

      this.logger.debug(
        'Session index cleanup interval has changed, the cleanup task will be rescheduled.'
      );

      try {
        await taskManager.remove(SESSION_INDEX_CLEANUP_TASK_NAME);
      } catch (err) {
        // We may have multiple instances of Kibana that are removing old task definition at the
        // same time. If we get 404 here then task was removed by another instance, it's fine.
        if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
          this.logger.error(`Failed to remove old session index cleanup task: ${err.message}`);
          throw err;
        }
      }
    } else if (this.isCleanupTaskScheduled) {
      // WORKAROUND: This is a workaround for the Task Manager issue: https://github.com/elastic/kibana/issues/75501
      // and should be removed as soon as this issue is resolved.
      this.logger.error(
        'Session index cleanup task has been already scheduled, but is missing in the task list for some reason. Please restart Kibana to automatically reschedule this task.'
      );
      return;
    }

    try {
      await taskManager.ensureScheduled({
        id: SESSION_INDEX_CLEANUP_TASK_NAME,
        taskType: SESSION_INDEX_CLEANUP_TASK_NAME,
        scope: ['security'],
        schedule: { interval: cleanupInterval },
        params: {},
        state: {},
      });
    } catch (err) {
      this.logger.error(`Failed to schedule session index cleanup task: ${err.message}`);
      throw err;
    }

    this.isCleanupTaskScheduled = true;
    this.logger.debug('Successfully scheduled session index cleanup task.');
  }
}
