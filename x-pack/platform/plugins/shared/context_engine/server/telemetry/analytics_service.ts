/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
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

/**
 * Server-side analytics wrapper for Context Engine telemetry.
 *
 * Owns EBT event type registration and reporting for KI and AI index writes.
 * Payloads never contain KI free text; user-owned AI index ids are hashed with
 * the cluster id as salt before reporting. A reporting failure never
 * propagates to the caller.
 */
export class ContextEngineAnalyticsService {
  private clusterUuid?: string;
  private clusterUuidPromise?: Promise<void>;
  private fetchClusterUuid?: () => Promise<string>;

  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  registerContextEngineEventTypes(): void {
    contextEngineServerEbtEvents.forEach((eventConfig) => {
      this.analytics.registerEventType(eventConfig);
    });
  }

  /**
   * Provides the fetcher for the cluster uuid that salts hashed AI index ids,
   * and starts the first fetch. Until a fetch succeeds, events report the id
   * as "unknown" and each reported event retries the fetch.
   */
  setClusterUuidFetcher(fetchClusterUuid: () => Promise<string>): void {
    this.fetchClusterUuid = fetchClusterUuid;
    this.refreshClusterUuid();
  }

  private refreshClusterUuid(): void {
    if (this.clusterUuid !== undefined || this.clusterUuidPromise || !this.fetchClusterUuid) {
      return;
    }
    this.clusterUuidPromise = this.fetchClusterUuid()
      .then((clusterUuid) => {
        this.clusterUuid = clusterUuid;
      })
      .catch((err) => {
        // Cleared so the next reported event retries the fetch.
        this.clusterUuidPromise = undefined;
        this.logger.debug(
          `Failed to resolve the cluster uuid for telemetry: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });
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
      this.refreshClusterUuid();
      return 'unknown';
    }
    return createHash('sha256')
      .update(aiIndexId + this.clusterUuid)
      .digest('hex');
  }
}
