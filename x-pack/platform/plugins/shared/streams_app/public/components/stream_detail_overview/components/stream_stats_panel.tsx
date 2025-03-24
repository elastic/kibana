/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  formatNumber,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
import { IngestStreamGetResponse, IngestStreamLifecycleILM } from '@kbn/streams-schema';
import { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';

import { LocatorPublic } from '@kbn/share-plugin/public';
import type { StreamDetailsResponse } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { IlmLink } from '../../data_management/stream_detail_lifecycle/ilm_link';
import {
  formatBytes,
  formatIngestionRate,
} from '../../data_management/stream_detail_lifecycle/helpers/format_bytes';
import { DataStreamStats } from '../../data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';

interface StreamStatsPanelProps {
  definition?: IngestStreamGetResponse;
  dataStreamStats?: DataStreamStats;
  docCount?: StreamDetailsResponse;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
}

const RetentionDisplay = ({
  definition,
  ilmLocator,
}: {
  definition?: IngestStreamGetResponse;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
}) => {
  if (!definition) return <>-</>;

  if ('dsl' in definition.effective_lifecycle) {
    return (
      <>
        {definition?.effective_lifecycle.dsl.data_retention ||
          i18n.translate('xpack.streams.entityDetailOverview.unlimited', {
            defaultMessage: 'Keep indefinitely',
          })}
      </>
    );
  }

  return (
    <IlmLink
      lifecycle={definition.effective_lifecycle as IngestStreamLifecycleILM}
      ilmLocator={ilmLocator}
    />
  );
};

interface StatItemProps {
  label: ReactNode;
  value: ReactNode;
  withBorder?: boolean;
}

const StatItem = ({ label, value, withBorder = false }: StatItemProps) => {
  const { euiTheme } = useEuiTheme();

  const borderStyle = withBorder
    ? css`
        border-left: 1px solid ${euiTheme.colors.borderBaseSubdued};
        padding-left: ${euiTheme.size.s};
      `
    : '';

  return (
    <EuiFlexItem grow className={borderStyle}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
        <EuiText
          size="m"
          className={css`
            font-weight: bold;
          `}
        >
          {value}
        </EuiText>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export function StreamStatsPanel({
  definition,
  dataStreamStats,
  docCount,
  ilmLocator,
}: StreamStatsPanelProps) {
  const retentionLabel = i18n.translate('xpack.streams.entityDetailOverview.retention', {
    defaultMessage: 'Data retention',
  });

  const documentCountLabel = i18n.translate('xpack.streams.entityDetailOverview.count', {
    defaultMessage: 'Document count',
  });

  const storageSizeLabel = i18n.translate('xpack.streams.entityDetailOverview.size', {
    defaultMessage: 'Storage size',
  });

  const ingestionLabel = i18n.translate('xpack.streams.entityDetailOverview.ingestion', {
    defaultMessage: 'Ingestion',
  });

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow={3}>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiText size="xs" color="subdued">
              {retentionLabel}
            </EuiText>
            <EuiText size="m">
              <RetentionDisplay definition={definition} ilmLocator={ilmLocator} />
            </EuiText>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={9}>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiFlexGroup>
            <StatItem
              label={documentCountLabel}
              value={docCount ? formatNumber(docCount.details.count || 0, 'decimal0') : '-'}
            />
            <StatItem
              label={
                <>
                  {storageSizeLabel}
                  <EuiIconTip
                    content={i18n.translate('xpack.streams.streamDetailOverview.sizeTip', {
                      defaultMessage:
                        'Estimated size based on the number of documents in the current time range and the total size of the stream.',
                    })}
                    position="right"
                  />
                </>
              }
              value={
                dataStreamStats && docCount
                  ? formatBytes(getStorageSizeForTimeRange(dataStreamStats, docCount))
                  : '-'
              }
              withBorder
            />
            <StatItem
              label={
                <>
                  {ingestionLabel}
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.streams.streamDetailLifecycle.ingestionRateDetails',
                      {
                        defaultMessage:
                          'Estimated average (stream total size divided by the number of days since creation).',
                      }
                    )}
                    position="right"
                  />
                </>
              }
              value={
                dataStreamStats ? formatIngestionRate(dataStreamStats.bytesPerDay || 0, true) : '-'
              }
              withBorder
            />
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function getStorageSizeForTimeRange(
  dataStreamStats: DataStreamStats,
  docCount: StreamDetailsResponse
) {
  const storageSize = dataStreamStats.sizeBytes;
  const totalCount = dataStreamStats.totalDocs;
  const countForTimeRange = docCount.details.count;
  if (!storageSize || !totalCount || !countForTimeRange) {
    return 0;
  }
  const bytesPerDoc = totalCount ? storageSize / totalCount : 0;
  return bytesPerDoc * countForTimeRange;
}
