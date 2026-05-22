/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, Streams } from '@kbn/streams-schema';
import { isDisabledLifecycle, isDslLifecycle } from '@kbn/streams-schema';
import { PHASE_ORDER } from '@kbn/data-lifecycle-phases';
import { getTimeSizeAndUnitLabel } from '../../../../../../util/format_size_units';

export type IlmStatsValue =
  | {
      phases?: IlmPolicyPhases;
      policy_missing?: boolean;
    }
  | undefined;

const formatDataPhasesSubtitle = (count: number): string =>
  i18n.translate('xpack.streams.streamDetailLifecycle.lifecycleSummary.dataPhasesCount', {
    defaultMessage: '{count, plural, one {# data phase} other {# data phases}}',
    values: { count },
  });

const formatDownsampleStepsSubtitle = (count: number): string =>
  i18n.translate('xpack.streams.streamDetailLifecycle.lifecycleSummary.downsampleStepsConfigured', {
    defaultMessage: '{count, plural, one {# downsample step} other {# downsample steps}}',
    values: { count },
  });

export const getRetentionValue = ({
  isPreviewActive,
  previewRetentionPeriod,
  isIlm,
  ilmStatsLoading,
  ilmStatsValue,
  lifecycle,
}: {
  isPreviewActive: boolean;
  previewRetentionPeriod: string | null;
  isIlm: boolean;
  ilmStatsLoading: boolean;
  ilmStatsValue: IlmStatsValue;
  lifecycle: Streams.ingest.all.GetResponse['effective_lifecycle'];
}): React.ReactNode => {
  if (isPreviewActive) {
    return (
      (previewRetentionPeriod ? getTimeSizeAndUnitLabel(previewRetentionPeriod) : undefined) ?? '∞'
    );
  }

  if (isIlm) {
    if (ilmStatsLoading) return '—';
    // Treat "no stats" as unknown instead of "infinite".
    if (!ilmStatsValue) return '—';
    const deleteMinAge = ilmStatsValue?.phases?.delete?.min_age;
    const formattedRetention = deleteMinAge ? getTimeSizeAndUnitLabel(deleteMinAge) : undefined;
    return formattedRetention ?? '∞';
  }

  if (isDslLifecycle(lifecycle)) {
    return getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention) ?? '∞';
  }

  if (isDisabledLifecycle(lifecycle)) {
    return '∞';
  }

  return '—';
};

export const getRetentionSubtitles = ({
  definition,
  lifecycle,
  isIlm,
  ilmStatsValue,
  isPreviewActive,
  previewDataPhasesCount,
  previewDownsampleStepsCount,
}: {
  definition: Streams.ingest.all.GetResponse;
  lifecycle: Streams.ingest.all.GetResponse['effective_lifecycle'];
  isIlm: boolean;
  ilmStatsValue: IlmStatsValue;
  isPreviewActive: boolean;
  previewDataPhasesCount: number | null;
  previewDownsampleStepsCount: number | null;
}): string[] => {
  const subtitles: string[] = [];
  const isTimeSeriesStream = definition.index_mode === 'time_series';

  const phasesCount = (() => {
    if (isPreviewActive) {
      return previewDataPhasesCount ?? undefined;
    }

    if (isIlm) {
      const ilmPhases = ilmStatsValue?.phases;
      if (!ilmPhases) return undefined;

      return PHASE_ORDER.filter((phaseName) => {
        return Boolean(ilmPhases[phaseName as keyof IlmPolicyPhases]);
      }).length;
    }

    if (isDslLifecycle(lifecycle)) {
      // DSL currently has a required hot/default phase and an optional delete phase (`data_retention`).
      return lifecycle.dsl.data_retention ? 2 : 1;
    }

    if (isDisabledLifecycle(lifecycle)) {
      return 1;
    }

    return undefined;
  })();

  const downsampleStepsCount = (() => {
    if (!isTimeSeriesStream) {
      return undefined;
    }

    if (isPreviewActive && previewDownsampleStepsCount != null) {
      return previewDownsampleStepsCount;
    }

    if (isIlm) {
      const phases = ilmStatsValue?.phases;
      if (!phases) return undefined;

      const hasDownsample = (phase: unknown): boolean => {
        if (!phase || typeof phase !== 'object') return false;
        const p = phase as { downsample?: unknown; actions?: { downsample?: unknown } };
        return Boolean(p.downsample ?? p.actions?.downsample);
      };

      return PHASE_ORDER.filter((phaseName) => {
        if (phaseName === 'delete') return false;
        return hasDownsample(phases[phaseName as Exclude<keyof IlmPolicyPhases, 'delete'>]);
      }).length;
    }

    if (isDslLifecycle(lifecycle)) {
      return lifecycle.dsl.downsample?.length ?? 0;
    }

    return 0;
  })();

  if (typeof phasesCount === 'number') {
    subtitles.push(formatDataPhasesSubtitle(phasesCount));
  }

  if (typeof downsampleStepsCount === 'number' && downsampleStepsCount > 0) {
    subtitles.push(formatDownsampleStepsSubtitle(downsampleStepsCount));
  }

  return subtitles;
};
