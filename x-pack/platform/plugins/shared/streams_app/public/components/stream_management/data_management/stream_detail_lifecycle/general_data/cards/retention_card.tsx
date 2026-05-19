/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { isDisabledLifecycle, isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import React, { useEffect } from 'react';
import { EuiButton } from '@elastic/eui';
import { PHASE_ORDER } from '@kbn/data-lifecycle-phases';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../../hooks/use_streams_app_fetch';
import { BaseMetricCard } from '../../common/base_metric_card';
import { getTimeSizeAndUnitLabel } from '../../../../../../util/format_size_units';
import { useLifecyclePreview } from '../../common/hooks/lifecycle_preview';
import { useLifecycleAfterSave } from '../../common/hooks/lifecycle_after_save';

export const RetentionCard = ({
  definition,
  openEditModal,
}: {
  definition: Streams.ingest.all.GetResponse;
  openEditModal: () => void;
}) => {
  const { refreshToken } = useLifecycleAfterSave();
  const {
    isActive: isPreviewActive,
    dataPhasesCount: previewDataPhasesCount,
    downsampleStepsCount: previewDownsampleStepsCount,
    retentionPeriod: previewRetentionPeriod,
  } = useLifecyclePreview();

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const lifecycle = definition.effective_lifecycle;

  const isIlm = isIlmLifecycle(lifecycle);

  const {
    value: ilmStatsValue,
    loading: ilmStatsLoading,
    refresh: refreshIlmStats,
  } = useStreamsAppFetch(
    ({ signal }) => {
      if (!isIlm) return undefined;
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/lifecycle/_stats', {
        params: { path: { name: definition.stream.name } },
        signal,
      });
    },
    [streamsRepositoryClient, definition.stream.name, isIlm],
    {
      withTimeRange: false,
      withRefresh: true,
      clearValueOnNext: true,
      unsetValueOnError: true,
      disableToastOnError: true,
    }
  );

  useEffect(() => {
    if (!isIlm) return;
    if (refreshToken === 0) return;
    refreshIlmStats();
  }, [isIlm, refreshIlmStats, refreshToken]);

  const getMetrics = () => {
    const subtitles: string[] = [];
    let data: React.ReactNode = '—';

    const isTimeSeriesStream = definition.index_mode === 'time_series';

    const phasesCount = (() => {
      if (isPreviewActive) {
        return previewDataPhasesCount ?? undefined;
      }

      if (isIlm) {
        const ilmPhases = ilmStatsValue?.phases;
        if (!ilmPhases) return undefined;
        return PHASE_ORDER.filter((phaseName) => Boolean(ilmPhases?.[phaseName])).length;
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
        const phases = ilmStatsValue?.phases ?? null;
        if (!phases) return undefined;

        const hasDownsample = (phase: unknown): boolean => {
          if (!phase || typeof phase !== 'object') return false;
          const p = phase as { downsample?: unknown; actions?: { downsample?: unknown } };
          return Boolean(p.downsample ?? p.actions?.downsample);
        };

        return PHASE_ORDER.filter((phaseName) => {
          if (phaseName === 'delete') return false;
          return hasDownsample((phases as Record<string, unknown>)[phaseName]);
        }).length;
      }

      if (isDslLifecycle(lifecycle)) {
        return lifecycle.dsl.downsample?.length ?? 0;
      }

      return 0;
    })();
    if (typeof phasesCount === 'number') {
      subtitles.push(
        i18n.translate('xpack.streams.streamDetailLifecycle.lifecycleSummary.dataPhasesCount', {
          defaultMessage: '{count, plural, one {# data phase} other {# data phases}}',
          values: { count: phasesCount },
        })
      );
    }

    if (typeof downsampleStepsCount === 'number' && downsampleStepsCount > 0) {
      subtitles.push(
        i18n.translate(
          'xpack.streams.streamDetailLifecycle.lifecycleSummary.downsampleStepsConfigured',
          {
            defaultMessage: '{count, plural, one {# downsample step} other {# downsample steps}}',
            values: { count: downsampleStepsCount },
          }
        )
      );
    }

    if (isPreviewActive) {
      data =
        (previewRetentionPeriod ? getTimeSizeAndUnitLabel(previewRetentionPeriod) : undefined) ??
        '∞';
    } else if (isIlm) {
      if (!ilmStatsLoading) {
        const deleteMinAge = ilmStatsValue?.phases?.delete?.min_age;
        const formattedRetention = deleteMinAge ? getTimeSizeAndUnitLabel(deleteMinAge) : undefined;
        data = formattedRetention ?? '∞';
      }
    } else if (isDslLifecycle(lifecycle)) {
      data = getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention) ?? '∞';
    } else if (isDisabledLifecycle(lifecycle)) {
      data = '∞';
    } else {
      data = '—';
    }

    return [
      {
        data,
        subtitle: subtitles,
        'data-test-subj': 'retention',
      },
    ];
  };

  const title = i18n.translate('xpack.streams.streamDetailLifecycle.lifecycleSummary.title', {
    defaultMessage: 'Lifecycle summary',
  });

  const metrics = getMetrics();

  return (
    <BaseMetricCard
      title={title}
      actions={
        <EuiButton
          data-test-subj="streamsAppRetentionMetadataEditDataRetentionButton"
          size="s"
          color="text"
          onClick={openEditModal}
          disabled={!definition.privileges.lifecycle || isPreviewActive}
          aria-label={i18n.translate(
            'xpack.streams.entityDetailViewWithoutParams.editLifecycleMethodAriaLabel',
            {
              defaultMessage: 'Edit lifecycle method',
            }
          )}
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.editLifecycleMethod', {
            defaultMessage: 'Edit lifecycle method',
          })}
        </EuiButton>
      }
      metrics={metrics}
      data-test-subj="retentionCard"
    />
  );
};
