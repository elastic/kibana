/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { RulesClientApi } from '../../../types';
import type { RulesClientContext } from '../../../rules_client/types';
import type { ScheduleBackfillResult } from '../../../application/backfill/methods/schedule/types';
import type { SchedulerSoAttributes, GapAutoFillSchedulerLogConfig } from '../types/scheduler';
import { backfillInitiator } from '../../../../common/constants';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import type { GapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import { GAP_AUTO_FILL_STATUS } from '../types/scheduler';
import type { Gap } from '../gap';
import { getOverlap } from '../gap/interval_utils';
import { GapFillSchedulePerRuleStatus } from '../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/types';

export type LogMessageFunction = (message: string) => void;

export interface AggregatedByRuleEntry {
  ruleId: string;
  processedGaps: number;
  status: 'success' | 'error';
  error?: string;
}

export function resultsFromMap(
  aggregatedByRule: Map<string, AggregatedByRuleEntry>
): AggregatedByRuleEntry[] {
  return Array.from(aggregatedByRule.values());
}

export function formatConsolidatedSummary(consolidated: AggregatedByRuleEntry[]): string {
  const rulesCount = consolidated.length;
  const gapsProcessed = consolidated.reduce((sum, r) => sum + (r.processedGaps ?? 0), 0);
  const errorEntries = consolidated.filter((r) => r.status === GapFillSchedulePerRuleStatus.ERROR);
  const errorCount = errorEntries.length;
  const errorsList = errorEntries
    .map((r) => (r.error ? `${r.ruleId} (${r.error})` : r.ruleId))
    .join('\n ');

  const successEntries = consolidated.filter(
    (r) => r.status === GapFillSchedulePerRuleStatus.SUCCESS
  );
  const successCount = successEntries.length;
  const successList = successEntries
    .map((r) => `${r.ruleId} (${r.processedGaps} gaps processed)`)
    .join('\n ');

  const parts: string[] = [];
  parts.push(
    `processed ${gapsProcessed} gap${gapsProcessed === 1 ? '' : 's'} across ${rulesCount} rule${
      rulesCount === 1 ? '' : 's'
    }`
  );
  if (successCount > 0) {
    parts.push(`${successCount} success${successCount === 1 ? '' : 'es'}: ${successList}`);
  }
  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount === 1 ? '' : 's'}: ${errorsList}`);
  }

  return `\n${parts.join(' \n')}`;
}

export async function handleCancellation({
  wasCancelled,
  abortController,
  aggregatedByRule,
  logEvent,
}: {
  wasCancelled: boolean;
  abortController?: AbortController;
  aggregatedByRule: Map<string, AggregatedByRuleEntry>;
  logEvent: GapAutoFillSchedulerEventLogger;
}): Promise<boolean> {
  if (!wasCancelled && !abortController?.signal.aborted) return false;

  const consolidated = resultsFromMap(aggregatedByRule);

  await logEvent({
    status: GAP_AUTO_FILL_STATUS.SUCCESS,
    results: consolidated,
    message: `Gap Auto Fill Scheduler cancelled by timeout | Results: ${formatConsolidatedSummary(
      consolidated
    )}`,
  });

  return true;
}

export async function filterGapsWithOverlappingBackfills(
  gaps: Gap[],
  rulesClientContext: RulesClientContext,
  logMessage: LogMessageFunction
): Promise<Gap[]> {
  const filteredGaps: Gap[] = [];

  const actionsClient = await rulesClientContext.getActionsClient();
  const backfillClient = rulesClientContext.backfillClient;
  const gapsByRuleId = new Map<string, Gap[]>();
  for (const gap of gaps) {
    const gapsForRule = gapsByRuleId.get(gap.ruleId) ?? [];
    gapsForRule.push(gap);
    gapsByRuleId.set(gap.ruleId, gapsForRule);
  }

  for (const [ruleId, ruleGaps] of gapsByRuleId.entries()) {
    const overlappingBackfills = await backfillClient.findOverlappingBackfills({
      ruleId,
      ranges: ruleGaps.map((gap) => ({ start: gap.range.gte, end: gap.range.lte })),
      savedObjectsRepository: rulesClientContext.internalSavedObjectsRepository,
      actionsClient,
    });
    if (overlappingBackfills.length === 0) {
      filteredGaps.push(...ruleGaps);
    } else {
      ruleGaps.forEach((gap) => {
        const isGapOverlappingWithBackfills = overlappingBackfills.some(
          (backfill: ScheduleBackfillResult) => {
            if ('error' in backfill) {
              return false;
            }
            if (!backfill.start || !backfill.end) {
              return false;
            }
            return (
              getOverlap(
                { gte: new Date(backfill.start), lte: new Date(backfill.end) },
                gap.range
              ) !== null
            );
          }
        );
        if (isGapOverlappingWithBackfills) {
          return;
        }
        filteredGaps.push(gap);
      });
    }
  }

  if (filteredGaps.length < gaps.length) {
    logMessage(
      `Filtered out ${gaps.length - filteredGaps.length} gaps that have overlapping backfills`
    );
  }

  return filteredGaps;
}

export async function initRun({
  fakeRequest,
  getRulesClientWithRequest,
  eventLogger,
  taskInstance,
  startTime,
}: {
  fakeRequest: KibanaRequest | undefined;
  getRulesClientWithRequest?: (request: KibanaRequest) => Promise<RulesClientApi> | undefined;
  eventLogger: IEventLogger;
  taskInstance: {
    id: string;
    scheduledAt: Date;
    state?: Record<string, unknown>;
    params?: { configId?: string };
  };
  startTime: Date;
}): Promise<{
  rulesClient: RulesClientApi;
  rulesClientContext: RulesClientContext;
  config: GapAutoFillSchedulerLogConfig;
  logEvent: GapAutoFillSchedulerEventLogger;
}> {
  if (!getRulesClientWithRequest || !fakeRequest) {
    throw new Error('Missing request or rules client factory');
  }
  const rulesClient = await getRulesClientWithRequest(fakeRequest);
  if (!rulesClient) {
    throw new Error('Missing rules client');
  }
  const rulesClientContext = rulesClient.getContext();
  const configId = taskInstance?.params?.configId;

  if (!configId) {
    throw new Error('Missing configId');
  }

  const soClient = rulesClientContext.unsecuredSavedObjectsClient;
  const schedulerSo = configId
    ? await soClient.get(GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE, configId)
    : null;

  if (!schedulerSo) {
    throw new Error('Missing gap_auto_fill_scheduler saved object');
  }
  const soAttrs = schedulerSo.attributes as SchedulerSoAttributes;
  const config: GapAutoFillSchedulerLogConfig = {
    name: soAttrs.name,
    amountOfRetries: soAttrs.amountOfRetries,
    gapFillRange: soAttrs.gapFillRange,
    schedule: soAttrs.schedule,
    maxBackfills: soAttrs.maxBackfills,
    ruleTypes: soAttrs.ruleTypes,
  };
  const logEvent = createGapAutoFillSchedulerEventLogger({
    eventLogger,
    context: rulesClientContext,
    taskInstance,
    startTime,
    config: soAttrs,
  });
  return { rulesClient, rulesClientContext, config, logEvent };
}

export async function checkBackfillCapacity({
  rulesClient,
  maxBackfills,
  logMessage,
  initiatorId,
}: {
  rulesClient: RulesClientApi;
  maxBackfills: number;
  logMessage: (message: string) => void;
  initiatorId: string;
}): Promise<{
  canSchedule: boolean;
  currentCount: number;
  maxBackfills: number;
  remainingCapacity: number;
}> {
  try {
    const findRes = await rulesClient.findBackfill({
      page: 1,
      perPage: 1,
      initiator: backfillInitiator.SYSTEM,
      initiatorId,
    });
    const currentCount = findRes.total;
    const remainingCapacity = Math.max(0, maxBackfills - currentCount);
    const canSchedule = remainingCapacity > 0;
    return { canSchedule, currentCount, maxBackfills, remainingCapacity };
  } catch (e) {
    logMessage(`Failed to check system backfills count: ${e && (e as Error).message}`);
    return { canSchedule: false, currentCount: 0, maxBackfills, remainingCapacity: maxBackfills };
  }
}
