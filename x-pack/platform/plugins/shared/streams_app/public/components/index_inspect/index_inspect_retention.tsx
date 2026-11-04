/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  isDslLifecycle,
  isIlmLifecycle,
  type ClassicIngestStreamEffectiveLifecycle,
} from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { getTimeSizeAndUnitLabel } from '../../util/format_size_units';
import { LifecycleBadge } from '../stream_badges';
import { BaseMetricCard } from '../stream_management/data_management/stream_detail_lifecycle/common/base_metric_card';
import { DataLifecycleSummary } from '../stream_management/data_management/stream_detail_lifecycle/common/data_lifecycle/data_lifecycle_summary';
import { buildDlmPreviewModel } from '../stream_management/data_management/stream_detail_lifecycle/common/data_lifecycle/preview_models';
import { SectionPanel } from '../stream_management/data_management/stream_detail_lifecycle/common/section_panel';
import { IngestionCard } from '../stream_management/data_management/stream_detail_lifecycle/general_data/cards/ingestion_card';
import { StorageSizeCard } from '../stream_management/data_management/stream_detail_lifecycle/general_data/cards/storage_size_card';
import { IngestionRateContent } from '../stream_management/data_management/stream_detail_lifecycle/general_data/ingestion_rate';
import { useIlmPhasesColorAndDescription } from '../stream_management/data_management/stream_detail_lifecycle/hooks/use_ilm_phases_color_and_description';
import { useIndexDataStreamStats } from './use_index_data_stream_stats';
import type { IndexMetadataResponse } from './use_index_metadata';

/** Read-only retention from ES lifecycle metadata; StreamDetailLifecycle loads the classic SO. */
export function IndexInspectRetention({
  indexName,
  metadata,
  metadataLoading,
}: {
  indexName: string;
  metadata?: IndexMetadataResponse;
  metadataLoading: boolean;
}) {
  const { isServerless } = useKibana();
  const { timeState } = useTimefilter();
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const statsFetch = useIndexDataStreamStats(indexName, timeState);
  const stats = statsFetch.value?.stats;

  if (metadataLoading && !metadata) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  if (!metadata?.is_data_stream) {
    return (
      <EuiEmptyPrompt
        iconType="indexOpen"
        title={
          <h2>
            {i18n.translate('xpack.streams.indexInspect.retention.missingTitle', {
              defaultMessage: 'Index not found',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.streams.indexInspect.retention.missingBody', {
              defaultMessage: '{indexName} is not a data stream, or it no longer exists.',
              values: { indexName },
            })}
          </p>
        }
      />
    );
  }

  const { lifecycle } = metadata;
  const retentionPeriod = isDslLifecycle(lifecycle) ? lifecycle.dsl.data_retention : undefined;
  const downsampleSteps = isDslLifecycle(lifecycle) ? lifecycle.dsl.downsample ?? null : null;
  const preview = isDslLifecycle(lifecycle)
    ? buildDlmPreviewModel({
        isServerless,
        hotColor: ilmPhases.hot.color,
        hotDescription: ilmPhases.hot.description,
        deletePhaseColor: ilmPhases.delete.color,
        deletePhaseDescription: ilmPhases.delete.description,
        frozenAfter: lifecycle.dsl.frozen_after,
        frozenColor: ilmPhases.frozen.color,
        frozenDescription: ilmPhases.frozen.description,
        retentionPeriod,
        downsampleSteps,
        indexMode: 'standard',
      })
    : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="m" css={{ flexGrow: 0 }}>
      <SectionPanel
        topCard={<IndexRetentionCard lifecycle={lifecycle} />}
        bottomCard={
          <StorageSizeCard
            hasMonitorPrivileges={metadata.privileges.monitor}
            stats={stats}
            statsError={statsFetch.error}
          />
        }
      >
        {preview ? (
          <DataLifecycleSummary
            model={{
              phases: preview.phases,
              downsampleSteps: preview.downsampleSteps ?? undefined,
              loading: false,
            }}
            showDownsampling={Boolean(preview.downsampleSteps?.length)}
            capabilities={{ canManageLifecycle: false }}
            title={i18n.translate('xpack.streams.indexInspect.retention.lifecycleTitle', {
              defaultMessage: 'Data lifecycle',
            })}
            titleBadge={<LifecycleBadge lifecycle={lifecycle} />}
            phaseActions={{ showPhaseActions: false }}
            uiState={{ disableInteractions: true }}
          />
        ) : (
          <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m" css={{ height: '100%' }}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.streams.indexInspect.retention.lifecycleTitle', {
                  defaultMessage: 'Data lifecycle',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <LifecycleBadge lifecycle={lifecycle} />
              </EuiFlexItem>
              {isIlmLifecycle(lifecycle) && (
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    {i18n.translate('xpack.streams.indexInspect.retention.ilmDescription', {
                      defaultMessage: 'This index is managed by an ILM policy.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        )}
      </SectionPanel>
      <SectionPanel
        topCard={
          <IngestionCard
            period="daily"
            hasMonitorPrivileges={metadata.privileges.monitor}
            stats={stats}
            statsError={statsFetch.error}
          />
        }
        bottomCard={
          <IngestionCard
            period="monthly"
            hasMonitorPrivileges={metadata.privileges.monitor}
            stats={stats}
            statsError={statsFetch.error}
          />
        }
      >
        <IngestionRateContent
          indexName={indexName}
          isIlm={isIlmLifecycle(lifecycle)}
          isLoadingStats={statsFetch.loading}
          stats={stats}
          timeState={timeState}
          statsError={statsFetch.error}
          aggregations={statsFetch.value?.aggregations}
        />
      </SectionPanel>
    </EuiFlexGroup>
  );
}

function IndexRetentionCard({ lifecycle }: { lifecycle: ClassicIngestStreamEffectiveLifecycle }) {
  const value = isDslLifecycle(lifecycle)
    ? getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention) ?? '∞'
    : isIlmLifecycle(lifecycle)
    ? lifecycle.ilm.policy
    : '—';

  return (
    <BaseMetricCard
      title={i18n.translate('xpack.streams.indexInspect.retention.summaryTitle', {
        defaultMessage: 'Lifecycle summary',
      })}
      metrics={[
        {
          data: value,
          subtitle: isIlmLifecycle(lifecycle)
            ? i18n.translate('xpack.streams.indexInspect.retention.ilmSubtitle', {
                defaultMessage: 'ILM policy',
              })
            : i18n.translate('xpack.streams.indexInspect.retention.dslSubtitle', {
                defaultMessage: 'Data retention',
              }),
          'data-test-subj': 'indexInspectRetention',
        },
      ]}
      data-test-subj="indexInspectRetentionCard"
    />
  );
}
