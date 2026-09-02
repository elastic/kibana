/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { WorkerRunBudgetGroupId } from '../../../common/run_quotas';
import { DEFAULT_RUN_LIMITS } from '../../../common/run_quotas';
import type {
  PersistedRunQuotaDriverHealth,
  RunQuotaApplicabilityGeneration,
  RunQuotaHeartbeatAttributes,
  RunQuotaSettingsAttributes,
} from './saved_objects';
import { mutateRunQuotaHeartbeat, type RunQuotaSavedObjectsRepository } from './repository';

export interface DetectionReachabilityTarget {
  spaceId: string;
  enabled: boolean;
  reviewIntervalMinutes: number;
  driverUpdatedAt?: string;
}

export interface KiReachabilityTarget {
  enabled: boolean;
  driverUpdatedAt?: string;
}

const defaultGeneration = (
  settings: RunQuotaSettingsAttributes,
  now: string
): RunQuotaApplicabilityGeneration => ({
  generation: 0,
  changedAt: settings.enabledAt ?? settings.updatedAt ?? now,
});

const latestTimestamp = (timestamps: Array<string | undefined>, fallback: string): string =>
  timestamps
    .filter((value): value is string => value !== undefined)
    .sort()
    .at(-1) ?? fallback;

const createApplicabilityToken = (parts: Record<string, string | number | boolean>): string =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');

const evaluateTarget = async ({
  internalRepository,
  settings,
  group,
  spaceId,
  scheduleEnabled,
  intervalMinutes,
  driverUpdatedAt,
  maintenancePaused,
  now,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  settings: RunQuotaSettingsAttributes;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  scheduleEnabled: boolean;
  intervalMinutes: number;
  driverUpdatedAt?: string;
  maintenancePaused: boolean;
  now: string;
}): Promise<'healthy' | 'degraded' | 'unknown' | 'not_applicable'> => {
  const globalGeneration = settings.applicability?.global ?? defaultGeneration(settings, now);
  const groupGeneration = settings.applicability?.groups[group] ?? defaultGeneration(settings, now);
  const limit = settings.limits[group] ?? DEFAULT_RUN_LIMITS[group];
  const applicable =
    settings.enforcementEnabled === true && limit.enabled && !maintenancePaused && scheduleEnabled;
  let observedHeartbeat: RunQuotaHeartbeatAttributes | undefined;

  await mutateRunQuotaHeartbeat({
    internalRepository,
    group,
    spaceId,
    initialChangedAt: now,
    mutation: (current) => {
      const observedApplicabilityToken = createApplicabilityToken({
        globalGeneration: globalGeneration.generation,
        groupGeneration: groupGeneration.generation,
        scheduleGeneration: current.scheduleGeneration,
        scheduleEnabled,
        driverUpdatedAt: driverUpdatedAt ?? 'missing',
      });
      const monitoringSince =
        current.observedApplicabilityToken === observedApplicabilityToken && current.monitoringSince
          ? current.monitoringSince
          : latestTimestamp(
              [
                globalGeneration.changedAt,
                groupGeneration.changedAt,
                current.scheduleGenerationChangedAt,
                driverUpdatedAt,
              ],
              now
            );
      observedHeartbeat = {
        ...current,
        monitoringEnabled: applicable,
        monitoringSince: applicable ? monitoringSince : current.monitoringSince,
        observedApplicabilityToken,
      };
      return observedHeartbeat;
    },
  });

  if (!applicable) {
    return 'not_applicable';
  }
  if (!driverUpdatedAt || !observedHeartbeat?.monitoringSince) {
    return 'unknown';
  }

  const monitoringSince = Date.parse(observedHeartbeat.monitoringSince);
  const recordedAt = observedHeartbeat.recordedAt
    ? Date.parse(observedHeartbeat.recordedAt)
    : Number.NEGATIVE_INFINITY;
  const nowMs = Date.parse(now);
  const staleAfterMs = intervalMinutes * 2 * 60_000;

  if (recordedAt >= monitoringSince) {
    return nowMs - recordedAt <= staleAfterMs ? 'healthy' : 'degraded';
  }
  return nowMs - monitoringSince <= staleAfterMs ? 'unknown' : 'degraded';
};

const aggregateDetectionHealth = (
  results: Array<{ spaceId: string; status: Awaited<ReturnType<typeof evaluateTarget>> }>,
  checkedAt: string
): PersistedRunQuotaDriverHealth => {
  const applicable = results.filter(({ status }) => status !== 'not_applicable');
  if (applicable.length === 0) {
    return { status: 'not_applicable', checkedAt };
  }
  const staleSpaceIds = applicable
    .filter(({ status }) => status === 'degraded')
    .map(({ spaceId }) => spaceId);
  if (staleSpaceIds.length > 0) {
    return { status: 'degraded', checkedAt, staleSpaceIds };
  }
  if (applicable.some(({ status }) => status === 'unknown')) {
    return { status: 'unknown', checkedAt };
  }
  return { status: 'healthy', checkedAt };
};

export const computeRunQuotaDriverHealth = async ({
  internalRepository,
  settings,
  detectionTargets,
  kiTarget,
  maintenancePaused,
  detectionUnavailable = false,
  kiUnavailable = false,
  now,
  signal,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  settings: RunQuotaSettingsAttributes;
  detectionTargets: DetectionReachabilityTarget[];
  kiTarget: KiReachabilityTarget;
  maintenancePaused: boolean;
  detectionUnavailable?: boolean;
  kiUnavailable?: boolean;
  now: string;
  signal?: AbortSignal;
}): Promise<Record<WorkerRunBudgetGroupId, PersistedRunQuotaDriverHealth>> => {
  const detectionResults: Array<{
    spaceId: string;
    status: Awaited<ReturnType<typeof evaluateTarget>>;
  }> = [];
  for (const target of detectionUnavailable ? [] : detectionTargets) {
    if (signal?.aborted) {
      return {
        detection: { status: 'unknown', checkedAt: now },
        ki_extraction: { status: 'unknown', checkedAt: now },
      };
    }
    detectionResults.push({
      spaceId: target.spaceId,
      status: await evaluateTarget({
        internalRepository,
        settings,
        group: 'detection',
        spaceId: target.spaceId,
        scheduleEnabled: target.enabled,
        intervalMinutes: target.reviewIntervalMinutes,
        driverUpdatedAt: target.driverUpdatedAt,
        maintenancePaused,
        now,
      }),
    });
  }

  const kiStatus = kiUnavailable
    ? 'unknown'
    : await evaluateTarget({
        internalRepository,
        settings,
        group: 'ki_extraction',
        spaceId: 'default',
        scheduleEnabled: kiTarget.enabled,
        intervalMinutes: 35,
        driverUpdatedAt: kiTarget.driverUpdatedAt,
        maintenancePaused,
        now,
      });

  return {
    detection: detectionUnavailable
      ? { status: 'unknown', checkedAt: now }
      : aggregateDetectionHealth(detectionResults, now),
    ki_extraction: { status: kiStatus, checkedAt: now },
  };
};
