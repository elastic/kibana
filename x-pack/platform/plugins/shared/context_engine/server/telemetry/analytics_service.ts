/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Subscription } from 'rxjs';
import { defer, map, retry, timer } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ContextEngineWriteOutcome, ReportKiWriteEventParams } from './events';
import { CONTEXT_ENGINE_EVENT_TYPES, contextEngineServerEbtEvents } from './events';

export type KiWriteAction = 'create' | 'update' | 'delete';

const KI_EVENT_TYPE_BY_ACTION: Record<KiWriteAction, string> = {
  create: CONTEXT_ENGINE_EVENT_TYPES.KiCreate,
  update: CONTEXT_ENGINE_EVENT_TYPES.KiUpdate,
  delete: CONTEXT_ENGINE_EVENT_TYPES.KiDelete,
};

const CLUSTER_UUID_RETRY_DELAY_MS = 1000;

/**
 * Server-side analytics wrapper for Context Engine telemetry.
 *
 * Owns EBT event type registration and reporting for KI writes.
 * Payloads never contain KI free text; user-owned AI index ids are hashed with
 * the cluster id as salt before reporting. A reporting failure never
 * propagates to the caller.
 */
export class ContextEngineAnalyticsService {
  private clusterUuid?: string;
  private clusterUuidSubscription?: Subscription;

  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  registerContextEngineEventTypes(): void {
    contextEngineServerEbtEvents.forEach((eventConfig) => {
      this.analytics.registerEventType(eventConfig);
    });
  }

  /**
   * Starts fetching the cluster uuid that salts hashed AI index ids, retrying
   * every second until it succeeds, mirroring core's `getClusterInfo$`.
   * Events report the id as "unknown" until the fetch succeeds.
   */
  setClusterUuidFetcher(fetchClusterUuid: () => Promise<string>): void {
    this.clusterUuidSubscription?.unsubscribe();
    this.clusterUuidSubscription = defer(fetchClusterUuid)
      .pipe(
        map((clusterUuid) => {
          // Elasticsearch reports '_na_' before cluster state recovery; caching
          // it would salt every deployment identically. Keep retrying instead.
          if (!clusterUuid || clusterUuid === '_na_') {
            throw new Error(`cluster uuid is not available yet: '${clusterUuid}'`);
          }
          return clusterUuid;
        }),
        retry({
          delay: (err) => {
            this.logger.debug(
              `Failed to resolve the cluster uuid for telemetry, retrying: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            return timer(CLUSTER_UUID_RETRY_DELAY_MS);
          },
        })
      )
      .subscribe((clusterUuid) => {
        this.clusterUuid = clusterUuid;
      });
  }

  stop(): void {
    this.clusterUuidSubscription?.unsubscribe();
  }

  reportKiWrite({
    action,
    aiIndexId,
    managed,
    outcome,
    errorType,
  }: {
    action: KiWriteAction;
    aiIndexId: string;
    managed?: boolean;
    outcome: ContextEngineWriteOutcome;
    errorType?: string;
  }): void {
    try {
      this.analytics.reportEvent<ReportKiWriteEventParams>(KI_EVENT_TYPE_BY_ACTION[action], {
        ai_index_id: this.aiIndexIdForTelemetry(aiIndexId, managed),
        ...(managed !== undefined && { managed }),
        outcome,
        ...(errorType !== undefined && { error_type: errorType }),
      });
    } catch (error) {
      // Do not fail the write if telemetry fails
      this.logger.debug(`Failed to report KI ${action} telemetry event`, { error });
    }
  }

  /**
   * The AI index id as it may appear in EBT payloads and log lines: managed
   * ids are registered from code and kept verbatim; everything else is
   * treated as user-owned and hashed with the cluster id as salt.
   */
  aiIndexIdForTelemetry(aiIndexId: string, managed?: boolean): string {
    if (managed) {
      return aiIndexId;
    }
    if (!this.clusterUuid) {
      return 'unknown';
    }
    return createHash('sha256')
      .update(aiIndexId + this.clusterUuid)
      .digest('hex');
  }
}
