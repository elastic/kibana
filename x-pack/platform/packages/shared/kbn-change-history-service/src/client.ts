/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type {
  ChangeHistoryAggregateField,
  GetChangeHistoryByFieldsOptions,
  GetChangeHistoryByFieldsResult,
  GetChangeHistoryOptions,
  GetHistoryResult,
  ObjectChange,
} from '@kbn/change-history';
import { ChangeHistoryClient } from '@kbn/change-history';
import type { DualWriteLogOptions, DualWriteObjectChange, TrackUserAction } from './types';

/**
 * Mirrors `IChangeHistoryClient` from `@kbn/change-history`, widened with the dual-write
 * types so the service client is a drop-in proxy for the inner history client.
 */
export interface IChangeHistoryServiceClient {
  isInitialized(): boolean;
  initialize(elasticsearchClient: ElasticsearchClient): Promise<void>;
  log(change: DualWriteObjectChange, opts: DualWriteLogOptions): Promise<void>;
  logBulk(changes: DualWriteObjectChange[], opts: DualWriteLogOptions): Promise<void>;
  getHistory(
    spaceId: string,
    objectType: string,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult>;
  getHistoryByFields(
    spaceId: string,
    objectType: string,
    objectId: string,
    fields: ChangeHistoryAggregateField[],
    opts?: GetChangeHistoryByFieldsOptions
  ): Promise<GetChangeHistoryByFieldsResult>;
}

/**
 * Composes the `@kbn/change-history` client and core's user-activity tracker behind the
 * single `IChangeHistoryClient`-shaped API, treating the two logs as **peers**: the caller
 * instruments once and each sink gates itself. Changes carrying a `userActivity` block
 * produce one user-activity entry each, regardless of whether the change-history write
 * happened (uninitialized sink, `writeHistory: false`) or succeeded (ES error). One sink's
 * unavailability never suppresses the other.
 */
export class ChangeHistoryServiceClient implements IChangeHistoryServiceClient {
  private readonly historyClient: ChangeHistoryClient;
  private readonly logger: Logger;
  private readonly trackUserAction?: TrackUserAction;

  constructor({
    module,
    dataset,
    logger,
    kibanaVersion,
    trackUserAction,
  }: {
    module: string;
    dataset: string;
    logger: Logger;
    kibanaVersion: string;
    /**
     * Optional callback used to emit a Kibana user-activity entry for each change that
     * carries a `userActivity` block. Emit failures are logged and never propagated.
     */
    trackUserAction?: TrackUserAction;
  }) {
    this.historyClient = new ChangeHistoryClient({ module, dataset, logger, kibanaVersion });
    this.logger = logger;
    this.trackUserAction = trackUserAction;
  }

  /**
   * Check if the change-history sink is initialized.
   */
  isInitialized(): boolean {
    return this.historyClient.isInitialized();
  }

  /**
   * Initialize the change-history sink. Failures propagate so the caller knows the sink
   * is unavailable and can apply its own policy. Note the dual-write path stays resilient
   * regardless: `logBulk` checks `isInitialized()` and keeps emitting user-activity
   * entries while history writes are skipped.
   */
  async initialize(elasticsearchClient: ElasticsearchClient): Promise<void> {
    await this.historyClient.initialize(elasticsearchClient);
  }

  /**
   * Log a change for a single object. @see {@link logBulk}
   */
  async log(change: DualWriteObjectChange, opts: DualWriteLogOptions): Promise<void> {
    return this.logBulk([change], opts);
  }

  /**
   * Log one or more changes to both sinks.
   *
   * 1. When `opts.writeHistory` is not `false` and the history sink is initialized, the
   *    changes are written to change history with their `userActivity` blocks stripped
   *    (the inner package never receives them). Write failures are logged, not thrown.
   * 2. Regardless of whether the history write happened or succeeded, one user-activity
   *    entry is emitted per change carrying a `userActivity` block (when a
   *    `trackUserAction` callback was injected). Each emit failure is isolated and logged.
   */
  async logBulk(changes: DualWriteObjectChange[], opts: DualWriteLogOptions): Promise<void> {
    const { writeHistory = true, ...historyOpts } = opts;

    if (writeHistory && this.historyClient.isInitialized()) {
      try {
        await this.historyClient.logBulk(changes.map(stripUserActivity), historyOpts);
      } catch (err) {
        this.logger.warn(`Error writing change history for action "${opts.action}": ${err}`);
      }
    }

    if (this.trackUserAction) {
      for (const { userActivity } of changes) {
        if (!userActivity) {
          continue;
        }
        try {
          this.trackUserAction(userActivity);
        } catch (err) {
          this.logger.warn(`Failed to track user action "${userActivity.event.action}": ${err}`);
        }
      }
    }
  }

  /**
   * Get the change history of an object. Pure delegation to `@kbn/change-history`.
   */
  async getHistory(
    spaceId: string,
    objectType: string,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult> {
    return this.historyClient.getHistory(spaceId, objectType, objectId, opts);
  }

  /**
   * Bucket distinct values for one or more fields. Pure delegation to `@kbn/change-history`.
   */
  async getHistoryByFields(
    spaceId: string,
    objectType: string,
    objectId: string,
    fields: ChangeHistoryAggregateField[],
    opts?: GetChangeHistoryByFieldsOptions
  ): Promise<GetChangeHistoryByFieldsResult> {
    return this.historyClient.getHistoryByFields(spaceId, objectType, objectId, fields, opts);
  }
}

/**
 * Removes the `userActivity` block before the change reaches `@kbn/change-history`, so it
 * is never persisted and never affects `object.hash`.
 */
const stripUserActivity = ({ userActivity, ...change }: DualWriteObjectChange): ObjectChange =>
  change;
