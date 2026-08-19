/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, isIlmLifecycle, isDslLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';

type QualityIndicators = 'good' | 'poor' | 'degraded';

const POOR_QUALITY_MINIMUM_PERCENTAGE = 3;
const DEGRADED_QUALITY_MINIMUM_PERCENTAGE = 0;

const mapPercentageToQuality = (percentages: number[]): QualityIndicators => {
  if (percentages.some((percentage) => percentage > POOR_QUALITY_MINIMUM_PERCENTAGE)) {
    return 'poor';
  }
  if (percentages.some((percentage) => percentage > DEGRADED_QUALITY_MINIMUM_PERCENTAGE)) {
    return 'degraded';
  }
  return 'good';
};

export const computeQualityMetrics = ({
  totalCount,
  degradedCount,
  failedCount,
  windowedTotalCount,
}: {
  totalCount: number;
  degradedCount: number;
  failedCount: number;
  windowedTotalCount?: number;
}): { degradedPct: number; failedPct: number; quality: QualityIndicators } => {
  const degradedPct = totalCount > 0 ? (degradedCount / totalCount) * 100 : 0;
  const windowTotal = windowedTotalCount ?? totalCount;
  const allAttempted = windowTotal + failedCount;
  const failedPct = allAttempted > 0 ? (failedCount / allAttempted) * 100 : 0;
  const quality = mapPercentageToQuality([degradedPct, failedPct]);
  return { degradedPct, failedPct, quality };
};

export const detectFailureStoreStatus = (definition: Streams.all.Definition): string => {
  if (!Streams.ingest.all.Definition.is(definition)) {
    return 'not_applicable';
  }
  const failureStore = definition.ingest.failure_store;
  if ('lifecycle' in failureStore) return 'enabled';
  if ('disabled' in failureStore) return 'disabled';
  if ('inherit' in failureStore) return 'inherited';
  return 'not_applicable';
};

export const buildRetentionInfo = (
  lifecycle: IngestStreamEffectiveLifecycle
): Record<string, unknown> => {
  const info: Record<string, unknown> = {};
  if (isIlmLifecycle(lifecycle)) {
    info.type = 'ilm';
    info.policy_name = lifecycle.ilm.policy;
  } else if (isDslLifecycle(lifecycle)) {
    info.type = 'dsl';
    info.data_retention = lifecycle.dsl.data_retention ?? 'indefinite';
  } else if (isInheritLifecycle(lifecycle)) {
    info.type = 'inherited';
  } else {
    info.type = 'unknown';
  }
  return info;
};

export const computeFailedPct = (failed: number, total: number): number => {
  const attempted = total + failed;
  return attempted > 0 ? Math.round((failed / attempted) * 10000) / 100 : 0;
};

export const getQualityAssessment = (
  last5m: number,
  last24h: number,
  sinceUpdate: number | null,
  pct5m?: number,
  pct24h?: number
): string => {
  if (sinceUpdate !== null) {
    if (sinceUpdate === 0 && last24h > 0) {
      return 'No failures since the pipeline was last updated. The prior failures are likely from before the update — this is a good sign. Offer to confirm with diagnose_stream if the user wants to verify.';
    }
    if (sinceUpdate > 0) {
      return 'Failures have occurred since the pipeline was last updated. This likely indicates an active processing issue. Offer to investigate the root cause with diagnose_stream before making definitive claims.';
    }
  }
  if (last5m > 0) {
    const severity = (pct5m ?? 0) > 5 ? 'significant' : 'low-volume';
    return `Failures detected in the last 5 minutes (${severity} failure rate) — likely an active processing issue, but the root cause is not yet known. Present this as a potential issue and offer to investigate with diagnose_stream before making definitive claims.`;
  }
  if (last24h > 0) {
    const severity = (pct24h ?? 0) > 5 ? 'significant' : 'low-volume';
    return `No failures in the last 5 minutes, but some occurred in the last 24 hours (${severity} failure rate). This could mean the issue was recently fixed, is intermittent, or only triggers under certain conditions — offer to investigate to clarify.`;
  }
  return 'No failed documents detected in this time window. This indicates the pipeline is working for current traffic, but does not rule out issues with data patterns not yet seen.';
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${Math.round(value * 100) / 100} ${units[i]}`;
};
