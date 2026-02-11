/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IClusterClient,
  Logger,
  SavedObjectsClientContract,
  FakeRequest,
} from '@kbn/core/server';
import { exhaustMap, Subject, takeUntil, timer } from 'rxjs';
import moment from 'moment';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { type Version } from '@kbn/upgrade-assistant-pkg-common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { getRollupJobByIndexName } from '@kbn/upgrade-assistant-pkg-server';
import type { ReindexSavedObject } from './types';
import type { Credential, CredentialStore } from './credential_store';
import { reindexActionsFactory } from './reindex_actions';
import type { ReindexService } from './reindex_service';
import { reindexServiceFactory } from './reindex_service';
import { sortAndOrderReindexOperations, queuedOpHasStarted, isQueuedOp } from './op_utils';

const POLL_INTERVAL = 30000;
const PAUSE_THRESHOLD_MULTIPLIER = 4;
// If no nodes have been able to update this index in 2 minutes (due to missing credentials), set to paused.
const PAUSE_WINDOW = POLL_INTERVAL * PAUSE_THRESHOLD_MULTIPLIER;

/**
 * Initial worker padding to avoid CPU bottlenecks when running the worker loop.
 * This value will start at 1 second and increase exponentially (doubling each time)
 * up to a maximum value, reducing unnecessary load on the system.
 *
 * IMPORTANT: The maximum padding must be significantly less than PAUSE_WINDOW to ensure
 * that other Kibanas never see the updated_at field being older than the PAUSE_WINDOW.
 * PAUSE_WINDOW = 2 minutes (120000ms), so we set the max padding to 30s, which ensures
 * at least 4 update attempts would happen before hitting the PAUSE_WINDOW threshold.
 */
const INITIAL_WORKER_PADDING_MS = 1000;
// Maximum worker padding set to POLL_INTERVAL (1/4 of PAUSE_WINDOW) to guarantee multiple
// updates will happen before operations are considered "stuck"
const MAX_WORKER_PADDING_MS = Math.floor(PAUSE_WINDOW / PAUSE_THRESHOLD_MULTIPLIER);

/**
 * A singleton worker that will coordinate two polling loops:
 *   (1) A longer loop that polls for reindex operations that are in progress. If any are found, loop (2) is started.
 *   (2) A tighter loop that pushes each in progress reindex operation through ReindexService.processNextStep. If all
 *       updated reindex operations are complete, this loop will terminate.
 *
 * The worker can also be forced to start loop (2) by calling forceRefresh(). This is done when we know a new reindex
 * operation has been started.
 *
 * This worker can be ran on multiple nodes without conflicts or dropped jobs. Reindex operations are locked by the
 * ReindexService and if any operation is locked longer than the ReindexService's timeout, it is assumed to have been
 * locked by a node that is no longer running (crashed or shutdown). In this case, another node may safely acquire
 * the lock for this reindex operation.
 */
export class ReindexWorker {
  private static version: Version;
  private static workerSingleton?: ReindexWorker;
  private readonly stop$ = new Subject<void>();
  private updateOperationLoopRunning: boolean = false;
  private inProgressOps: ReindexSavedObject[] = [];
  private readonly reindexService: ReindexService;
  private readonly log: Logger;
  private readonly security: SecurityPluginStart;
  private currentWorkerPadding: number = INITIAL_WORKER_PADDING_MS;
  private rollupsEnabled: boolean;
  private isServerless: boolean;

  public static create(
    client: SavedObjectsClientContract,
    credentialStore: CredentialStore,
    clusterClient: IClusterClient,
    log: Logger,
    licensing: LicensingPluginStart,
    security: SecurityPluginStart,
    version: Version,
    rollupsEnabled: boolean = true,
    isServerless: boolean = false
  ): ReindexWorker {
    if (ReindexWorker.workerSingleton) {
      log.debug(`More than one ReindexWorker cannot be created, returning existing worker.`);
    } else {
      ReindexWorker.workerSingleton = new ReindexWorker(
        client,
        credentialStore,
        clusterClient,
        log,
        licensing,
        security,
        version,
        rollupsEnabled,
        isServerless
      );
    }

    return ReindexWorker.workerSingleton;
  }

  private constructor(
    private client: SavedObjectsClientContract,
    private credentialStore: CredentialStore,
    private clusterClient: IClusterClient,
    log: Logger,
    private licensing: LicensingPluginStart,
    security: SecurityPluginStart,
    version: Version,
    rollupsEnabled: boolean = true,
    isServerless: boolean = false
  ) {
    this.log = log.get('reindex_worker');
    this.security = security;
    this.rollupsEnabled = rollupsEnabled;
    this.isServerless = isServerless;
    ReindexWorker.version = version;

    const callAsInternalUser = this.clusterClient.asInternalUser;

    this.reindexService = reindexServiceFactory(
      callAsInternalUser,
      reindexActionsFactory(
        this.client,
        callAsInternalUser,
        this.log,
        getRollupJobByIndexName,
        rollupsEnabled
      ),
      log,
      this.licensing,
      version,
      isServerless
    );
  }

  /**
   * Begins loop checking for in progress reindex operations.
   */
  public start = () => {
    this.log.debug('Starting worker...');
    timer(0, POLL_INTERVAL)
      .pipe(
        takeUntil(this.stop$),
        exhaustMap(() => this.pollForOperations())
      )
      .subscribe();
  };

  /**
   * Stops the worker from processing any further reindex operations.
   */
  public stop = () => {
    this.log.debug('Stopping worker...');
    this.stop$.next();
    this.updateOperationLoopRunning = false;
    this.currentWorkerPadding = INITIAL_WORKER_PADDING_MS;
  };

  public cleanupReindexOperations = async (indexNames: string[]) => {
    await this.reindexService.cleanupReindexOperations(indexNames);
  };

  /**
   * Should be called immediately after this server has started a new reindex operation.
   */
  public forceRefresh = () => {
    // Reset worker padding for immediate responsiveness to new operations
    this.currentWorkerPadding = INITIAL_WORKER_PADDING_MS;
    // We know refresh won't throw, but just in case it does in the future
    this.refresh().catch((error) => {
      this.log.warn(`Failed to force refresh the reindex operations: ${error}`);
    });
  };

  /**
   * Returns whether or not the given ReindexOperation is in the worker's queue.
   */
  public includes = (reindexOp: ReindexSavedObject) => {
    return this.inProgressOps.map((o) => o.id).includes(reindexOp.id);
  };

  /**
   * Runs an async loop until all inProgress jobs are complete or failed.
   */
  private startUpdateOperationLoop = async (): Promise<void> => {
    this.updateOperationLoopRunning = true;
    try {
      while (this.inProgressOps.length > 0) {
        this.log.debug(`Updating ${this.inProgressOps.length} reindex operations`);

        // Push each operation through the state machine and refresh.
        await Promise.all(this.inProgressOps.map(this.processNextStep));

        await this.refresh();

        if (
          this.inProgressOps.length &&
          this.inProgressOps.every((op) => !this.credentialStore.get(op))
        ) {
          // Apply exponential backoff to reduce system load
          await new Promise((resolve) => setTimeout(resolve, this.currentWorkerPadding));
          // Double the worker padding for next iteration, up to the maximum
          this.currentWorkerPadding = Math.min(
            this.currentWorkerPadding * 2,
            MAX_WORKER_PADDING_MS
          );
          this.log.debug(`Worker padding increased to ${this.currentWorkerPadding}ms`);
        } else {
          // Reset to initial value when we have operations with credentials
          this.currentWorkerPadding = INITIAL_WORKER_PADDING_MS;
        }
      }
    } catch (error) {
      this.log.warn(`Failed to update reindex operations: ${error}`);
    } finally {
      this.updateOperationLoopRunning = false;
    }
  };

  private pollForOperations = async () => {
    this.log.debug(`Polling for reindex operations`);

    await this.refresh();
  };

  private getCredentialScopedReindexService = (credential: Credential) => {
    const fakeRequest: FakeRequest = { headers: credential };
    const scopedClusterClient = this.clusterClient.asScoped(fakeRequest);
    const callAsCurrentUser = scopedClusterClient.asCurrentUser;
    const actions = reindexActionsFactory(
      this.client,
      callAsCurrentUser,
      this.log,
      getRollupJobByIndexName,
      this.rollupsEnabled
    );
    return reindexServiceFactory(
      callAsCurrentUser,
      actions,
      this.log,
      this.licensing,
      ReindexWorker.version,
      this.isServerless
    );
  };

  private updateInProgressOps = async () => {
    try {
      const inProgressOps = await this.reindexService.findAllByStatus(ReindexStatus.inProgress);
      const { parallel, queue } = sortAndOrderReindexOperations(inProgressOps);

      let [firstOpInQueue] = queue;

      if (firstOpInQueue && !queuedOpHasStarted(firstOpInQueue)) {
        this.log.debug(
          `Queue detected; current length ${queue.length}, current item ReindexOperation(id: ${firstOpInQueue.id}, indexName: ${firstOpInQueue.attributes.indexName})`
        );
        const credential = this.credentialStore.get(firstOpInQueue);
        if (credential) {
          const service = this.getCredentialScopedReindexService(credential);
          firstOpInQueue = await service.startQueuedReindexOperation(
            firstOpInQueue.attributes.indexName
          );
          // Re-associate the credentials
          await this.credentialStore.update({
            reindexOp: firstOpInQueue,
            security: this.security,
            credential,
          });
        }
      }

      this.inProgressOps = parallel.concat(firstOpInQueue ? [firstOpInQueue] : []);
    } catch (e) {
      this.log.debug(`Could not fetch reindex operations from Elasticsearch, ${e.message}`);
      this.inProgressOps = [];
    }
  };

  private refresh = async () => {
    await this.updateInProgressOps();
    // If there are operations in progress and we're not already updating operations, kick off the update loop
    if (!this.updateOperationLoopRunning) {
      await this.startUpdateOperationLoop();
    }
  };

  private lastCheckedQueuedOpId: string | undefined;
  private processNextStep = async (reindexOp: ReindexSavedObject): Promise<void> => {
    const credential = this.credentialStore.get(reindexOp);

    if (!credential) {
      // If this is a queued reindex op, and we know there can only ever be one in progress at a
      // given time, there is a small chance it may have just reached the front of the queue so
      // we give it a chance to be updated by another worker with credentials by making this a
      // noop once. If it has not been updated by the next loop we will mark it paused if it
      // falls outside of PAUSE_WINDOW.
      if (isQueuedOp(reindexOp)) {
        if (this.lastCheckedQueuedOpId !== reindexOp.id) {
          this.lastCheckedQueuedOpId = reindexOp.id;
          return;
        }
      }
      // This indicates that no Kibana nodes currently have credentials to update this job.
      const now = moment();
      const updatedAt = moment(reindexOp.updated_at);
      if (updatedAt < now.subtract(PAUSE_WINDOW)) {
        await this.reindexService.pauseReindexOperation(reindexOp.attributes.indexName);
        return;
      } else {
        // If it has been updated recently, we assume another node has the necessary credentials,
        // and this becomes a noop.
        return;
      }
    }

    const service = this.getCredentialScopedReindexService(credential);
    reindexOp = await swallowExceptions(service.processNextStep, this.log)(reindexOp);

    // Update credential store with most recent state.
    await this.credentialStore.update({ reindexOp, security: this.security, credential });
  };
}

/**
 * Swallows any exceptions that may occur during the reindex process. This prevents any errors from
 * stopping the worker from continuing to process more jobs.
 */
const swallowExceptions =
  (func: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>, log: Logger) =>
  async (reindexOp: ReindexSavedObject) => {
    try {
      return await func(reindexOp);
    } catch (e) {
      if (reindexOp.attributes.locked) {
        log.debug(`Skipping reindexOp with unexpired lock: ${reindexOp.id}`);
      } else {
        log.warn(`Error when trying to process reindexOp (${reindexOp.id}): ${e.toString()}`);
      }

      return reindexOp;
    }
  };
