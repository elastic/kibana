/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { RunQuotaReserveResponse } from '../../../common/run_quotas';
import type { InvestigatableEventResolution } from '../significant_events/events/event_client';
import {
  RUN_QUOTA_MAX_DECISIONS,
  RUN_QUOTA_MAX_SKIPPED_ROWS,
  type RunQuotaInvestigationDecision,
} from './saved_objects';
import {
  mutateRunQuotaLedger,
  readRunQuotaSettings,
  type RunQuotaSavedObjectsRepository,
} from './repository';
import type { RunQuotaExecutionReader } from './provenance';
import { validateInvestigationProvenance } from './provenance';
import { waitForInvestigationEvidence } from './investigation_evidence';
import { dayKey, resolveDailyWindow } from './window';

export interface RunQuotaEventResolver {
  resolveInvestigatableEvent: (
    eventId: string,
    eventUuid: string
  ) => Promise<InvestigatableEventResolution>;
}

export const reserveInvestigationRunQuota = async ({
  internalRepository,
  executionReader,
  eventResolver,
  request,
  executionId,
  eventId,
  eventUuid,
  spaceId,
  actor,
  logger,
  now = new Date(),
  waitForEvidence = waitForInvestigationEvidence,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  executionReader: RunQuotaExecutionReader;
  eventResolver: RunQuotaEventResolver;
  request: KibanaRequest;
  executionId: string;
  eventId: string;
  eventUuid: string;
  spaceId: string;
  actor: string;
  logger: Logger;
  now?: Date;
  waitForEvidence?: typeof waitForInvestigationEvidence;
}): Promise<RunQuotaReserveResponse> => {
  await validateInvestigationProvenance({
    request,
    executionId,
    spaceId,
    executionReader,
  });
  const settings = await readRunQuotaSettings(internalRepository);
  if (!settings.enforcementEnabled) {
    return { granted: true, pastLimit: false };
  }
  await waitForEvidence({
    executionReader,
    executionId,
    eventId,
    eventUuid,
  });

  const resolvedEvent = await eventResolver.resolveInvestigatableEvent(eventId, eventUuid);
  if (!resolvedEvent.eligible) {
    return { granted: false, pastLimit: false, reason: 'ineligible' };
  }

  const limit = settings.limits.investigation;
  if (!limit?.enabled) {
    return { granted: true, pastLimit: false };
  }

  const decidedAt = now.toISOString();
  let response: RunQuotaReserveResponse = {
    granted: false,
    pastLimit: false,
    reason: 'limit',
  };
  await mutateRunQuotaLedger({
    internalRepository,
    date: dayKey(resolveDailyWindow(now)),
    group: 'investigation',
    mutation: (ledger) => {
      const existingDecision = ledger.decisions.find(
        (decision) => decision.eventUuid === eventUuid
      );
      if (existingDecision) {
        if (existingDecision.eventId !== eventId) {
          throw new Error('Investigation decision event identity does not match');
        }
        response = {
          granted: existingDecision.granted,
          pastLimit: existingDecision.pastLimit,
          ...(existingDecision.granted ? {} : { reason: 'limit' as const }),
        };
        return {};
      }

      const withinLimit = ledger.count < limit.max;
      const criticalPastLimit = !withinLimit && resolvedEvent.severity === '80-critical';
      const granted = withinLimit || criticalPastLimit;
      const decision: RunQuotaInvestigationDecision = {
        eventUuid,
        eventId,
        actor,
        granted,
        pastLimit: criticalPastLimit,
        decidedAt,
      };
      const allDecisions = [...ledger.decisions, decision];
      const decisionsEvicted = allDecisions.length > RUN_QUOTA_MAX_DECISIONS;
      const decisions = decisionsEvicted
        ? allDecisions.slice(-RUN_QUOTA_MAX_DECISIONS)
        : allDecisions;

      response = {
        granted,
        pastLimit: criticalPastLimit,
        ...(granted ? {} : { reason: 'limit' as const }),
      };
      logger.info(
        `Investigation run quota decision actor=[${actor}] eventId=[${eventId}] granted=[${granted}] pastLimit=[${criticalPastLimit}]`
      );

      if (granted) {
        return {
          count: ledger.count + 1,
          withinLimitGrantCount: ledger.withinLimitGrantCount + (withinLimit ? 1 : 0),
          criticalPastLimitGrantCount:
            ledger.criticalPastLimitGrantCount + (criticalPastLimit ? 1 : 0),
          decisions,
          decisionsEvicted: ledger.decisionsEvicted || decisionsEvicted,
        };
      }

      return {
        decisions,
        skipped: [
          ...ledger.skipped,
          {
            eventUuid,
            eventId,
            spaceId,
            severity: resolvedEvent.severity,
            decidedAt,
          },
        ].slice(-RUN_QUOTA_MAX_SKIPPED_ROWS),
        totalSkipped: ledger.totalSkipped + 1,
        decisionsEvicted: ledger.decisionsEvicted || decisionsEvicted,
      };
    },
  });

  return response;
};
