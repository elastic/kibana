/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * TaskCoordinator = the coordination half of TaskPollingLifecycle, extracted
 * behind the three-channel interface. It owns:
 *   - the poll loop (reuses polling/task_poller verbatim)
 *   - mget claiming (./claimer fork)
 *   - kibana discovery heartbeat (./coordinator_discovery fork)
 *   - partitioning (./coordinator_partitioner fork)
 *   - claim-nudge watching (reuses claim_nudge/claim_nudge_service verbatim)
 *
 * HARD DEPENDENCY GATE: instantiable from
 *   { esClient, logger, config, serializer } + plain-data context/channels.
 * Zero imports (runtime) from task_pool, task_running, or CoreStart contracts.
 * Enforced by dep_check.js, not by inspection.
 *
 * Simplifications vs the fused original (documented cuts):
 *   - No ES-error backpressure scans (createCapacityScan/createPollIntervalScan
 *     error halving); only the mget low-utilization poll-interval switch is
 *     replicated, driven by channel-3 execution reports.
 *   - No TaskClaim/TaskPollingCycle event emission (claim stats cross channel
 *     2; the executor re-emits lifecycle events for monitoring).
 *   - No startup reconciliation (reset of in-flight tasks stays executor-side,
 *     it needs the full TaskStore).
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';

import type { TaskManagerConfig } from '../config';
import { LOW_UTILIZATION_POLL_INTERVAL } from '../config';
import type { TaskPoller } from '../polling/task_poller';
import { createTaskPoller } from '../polling/task_poller';
import { TaskManagerClaimNudgeService } from '../claim_nudge/claim_nudge_service';
import { intervalFromNow } from '../lib/intervals';
import { isErr } from '../lib/result_type';

import { CoordinatorStore } from './coordinator_store';
import { CoordinatorDefinitionsRegistry } from './definitions_registry';
import { CoordinatorDiscoveryService } from './coordinator_discovery';
import { CoordinatorPartitioner } from './coordinator_partitioner';
import { claimAvailableTasks } from './claimer';
import type {
  CapacitySnapshot,
  ClaimedTaskBatch,
  CoordinatorContext,
  CoordinatorLogger,
  ExecutionReport,
} from './types';

/** How many channel-3 reports feed the running-average utilization (≈15s at 500ms). */
const UTILIZATION_WINDOW = 30;
/** Average utilization below which the mget poll interval relaxes to LOW_UTILIZATION_POLL_INTERVAL. */
const LOW_UTILIZATION_THRESHOLD = 25;

export interface TaskCoordinatorDeps {
  esClient: ElasticsearchClient;
  logger: CoordinatorLogger;
  config: TaskManagerConfig;
  serializer: ISavedObjectsSerializer;
  context: CoordinatorContext;
  /** Channel 1: executor -> coordinator. */
  capacity$: Observable<CapacitySnapshot>;
  /** Channel 3: executor -> coordinator. */
  executionReport$: Observable<ExecutionReport>;
}

export class TaskCoordinator {
  /** Channel 2: coordinator -> executor. */
  public readonly claimedBatches$ = new Subject<ClaimedTaskBatch>();
  public readonly claimErrors$ = new Subject<Error>();

  private readonly logger: CoordinatorLogger;
  private readonly config: TaskManagerConfig;
  private readonly context: CoordinatorContext;
  private readonly store: CoordinatorStore;
  private readonly definitions: CoordinatorDefinitionsRegistry;
  private readonly discovery: CoordinatorDiscoveryService;
  private readonly partitioner: CoordinatorPartitioner;
  private readonly nudgeService: TaskManagerClaimNudgeService | undefined;
  private readonly poller: TaskPoller<string, ClaimedTaskBatch>;
  private readonly pollInterval$: BehaviorSubject<number>;
  private readonly subscriptions: Subscription[] = [];

  private latestCapacity: CapacitySnapshot;
  private utilizationWindow: number[] = [];
  private cycle = 0;
  private stopped = false;

  constructor(deps: TaskCoordinatorDeps) {
    const { esClient, logger, config, serializer, context, capacity$, executionReport$ } = deps;
    this.logger = logger;
    this.config = config;
    this.context = context;

    this.definitions = new CoordinatorDefinitionsRegistry(context.definitions);
    this.store = new CoordinatorStore({
      esClient,
      serializer,
      index: context.taskIndex,
      taskManagerId: context.taskManagerId,
      definitions: this.definitions,
      logger,
    });

    this.discovery = new CoordinatorDiscoveryService({
      config: config.discovery,
      currentNode: context.podName,
      esClient,
      index: context.taskIndex,
      logger,
    });

    this.partitioner = new CoordinatorPartitioner({
      discoveryService: this.discovery,
      kibanasPerPartition: config.kibanas_per_partition,
      podName: context.podName,
      logger,
    });

    if (config.claim_nudge.enabled) {
      this.nudgeService = new TaskManagerClaimNudgeService({
        logger: logger as unknown as Logger,
        esClient,
        index: context.claimNudgeIndex,
        isServerless: context.isServerless,
      });
    }

    // Until the executor reports, assume starting capacity (advisory anyway).
    this.latestCapacity = {
      availableCapacity: context.startingCapacity,
      availableCapacityByType: {},
      usedCapacityPercentage: 0,
      paused: false,
      pausedTaskTypes: [],
      takenAt: Date.now(),
    };
    this.subscriptions.push(
      capacity$.subscribe((snapshot) => {
        this.latestCapacity = snapshot;
      })
    );

    // Channel 3 drives the mget low-utilization poll interval switch.
    this.pollInterval$ = new BehaviorSubject<number>(config.poll_interval);
    this.subscriptions.push(
      executionReport$.subscribe((report) => {
        this.utilizationWindow.push(report.tmUtilization);
        if (this.utilizationWindow.length > UTILIZATION_WINDOW) this.utilizationWindow.shift();
        const avg =
          this.utilizationWindow.reduce((sum, value) => sum + value, 0) /
          this.utilizationWindow.length;
        const next =
          avg < LOW_UTILIZATION_THRESHOLD
            ? Math.max(config.poll_interval, LOW_UTILIZATION_POLL_INTERVAL)
            : config.poll_interval;
        if (next !== this.pollInterval$.getValue()) {
          this.logger.info(
            `Coordinator poll interval changing to ${next}ms (avg utilization ${avg.toFixed(1)}%)`
          );
          this.pollInterval$.next(next);
        }
      })
    );

    this.poller = createTaskPoller<string, ClaimedTaskBatch>({
      logger: logger as unknown as Logger,
      initialPollInterval: config.poll_interval,
      pollInterval$: this.pollInterval$,
      claimNudge$: this.nudgeService?.claimNudge$,
      getCapacity: () => this.getAvailableCapacity(),
      work: this.claimCycle,
    });

    this.subscriptions.push(
      this.poller.events$.subscribe((result) => {
        // asOk results already crossed channel 2 inside claimCycle; surface errors.
        if (isErr(result)) {
          this.logger.error(`Coordinator claim cycle failed: ${result.error.message}`);
          this.claimErrors$.next(result.error);
        }
      })
    );
  }

  public async start() {
    this.logger.info(
      `TaskCoordinator starting for node "${this.context.podName}" (claiming as "${this.context.taskManagerId}") with ${this.context.definitions.length} task types`
    );
    this.nudgeService?.start();
    // Discovery heartbeat must be up before partition assignment matters, but
    // the poller does not need to wait on the first upsert.
    void this.discovery.start();
    this.poller.start();
  }

  public stop() {
    this.stopped = true;
    this.poller.stop();
    this.nudgeService?.stop();
    this.discovery.stop();
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }

  private getAvailableCapacity(taskType?: string): number {
    const { availableCapacity, availableCapacityByType, paused } = this.latestCapacity;
    if (paused) return 0;
    if (taskType && availableCapacityByType[taskType] !== undefined) {
      return availableCapacityByType[taskType];
    }
    return availableCapacity;
  }

  private claimCycle = async (): Promise<ClaimedTaskBatch> => {
    const cycle = ++this.cycle;
    const { pausedTaskTypes } = this.latestCapacity;
    const batch = await claimAvailableTasks({
      store: this.store,
      definitions: this.definitions,
      partitioner: this.partitioner,
      logger: this.logger,
      claimOwnershipUntil: intervalFromNow('30s')!,
      getCapacity: (taskType?: string) => this.getAvailableCapacity(taskType),
      excludedTaskTypePatterns: [...this.context.excludedTaskTypes, ...pausedTaskTypes],
      defaultMaxAttempts: this.config.max_attempts,
      cycle,
    });
    if (!this.stopped) {
      this.claimedBatches$.next(batch);
    }
    return batch;
  };
}
