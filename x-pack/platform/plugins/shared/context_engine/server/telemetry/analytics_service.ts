/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ContextEngineOutcome,
  ReportKiVerificationEventParams,
  ReportKiWriteEventParams,
} from './events';
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
 * Owns EBT event type registration and reporting for KI writes
 * and KI verification outcomes.
 * Payloads never contain KI free text. A reporting failure never
 * propagates to the caller.
 */
export class ContextEngineAnalyticsService {
  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  registerContextEngineEventTypes(): void {
    contextEngineServerEbtEvents.forEach((eventConfig) => {
      this.analytics.registerEventType(eventConfig);
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
    outcome: ContextEngineOutcome;
    errorType?: string;
  }): void {
    try {
      this.analytics.reportEvent<ReportKiWriteEventParams>(KI_EVENT_TYPE_BY_ACTION[action], {
        ai_index_id: aiIndexId,
        ...(managed !== undefined && { managed }),
        outcome,
        ...(errorType !== undefined && { error_type: errorType }),
      });
    } catch (error) {
      // Do not fail the write if telemetry fails
      this.logger.debug(`Failed to report KI ${action} telemetry event`, { error });
    }
  }

  reportKiVerification({
    outcome,
    passed,
    verifiersRun,
    failedVerifierIds,
    errorType,
  }: {
    outcome: ContextEngineOutcome;
    passed?: boolean;
    verifiersRun?: number;
    failedVerifierIds?: string[];
    errorType?: string;
  }): void {
    try {
      this.analytics.reportEvent<ReportKiVerificationEventParams>(
        CONTEXT_ENGINE_EVENT_TYPES.KiVerification,
        {
          outcome,
          ...(passed !== undefined && { passed }),
          ...(verifiersRun !== undefined && { verifiers_run: verifiersRun }),
          ...(failedVerifierIds !== undefined &&
            failedVerifierIds.length > 0 && { failed_verifier_ids: failedVerifierIds }),
          ...(errorType !== undefined && { error_type: errorType }),
        }
      );
    } catch (error) {
      this.logger.debug('Failed to report KI verification telemetry event', { error });
    }
  }
}
