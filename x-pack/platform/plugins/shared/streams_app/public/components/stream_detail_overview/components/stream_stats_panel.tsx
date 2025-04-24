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
import { type Streams, isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';

import { IlmLink } from '../../data_management/stream_detail_lifecycle/ilm_link';
import {
  formatBytes,
  formatIngestionRate,
} from '../../data_management/stream_detail_lifecycle/helpers/format_bytes';
import { useDataStreamStats } from '../../data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { PrivilegesWarningIconWrapper } from '../../insufficient_privileges/insufficient_privileges';

interface StreamStatsPanelProps {
  definition: Streams.ingest.all.GetResponse;
}

const RetentionDisplay = ({ definition }: { definition: Streams.ingest.all.GetResponse }) => {
  if (!definition) return <>-</>;

  if (isDslLifecycle(definition.effective_lifecycle)) {
    return (
      <>
        {definition?.effective_lifecycle.dsl.data_retention ||
          i18n.translate('xpack.streams.entityDetailOverview.unlimited', {
            defaultMessage: 'Keep indefinitely',
          })}
      </>
    );
  }

  if (isIlmLifecycle(definition.effective_lifecycle)) {
    return <IlmLink lifecycle={definition.effective_lifecycle} />;
  }

  return <>-</>;
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

export function StreamStatsPanel({ definition }: StreamStatsPanelProps) {
  const dataStreamStats = useDataStreamStats({ definition }).stats;
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
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexItem grow={3}>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiText size="xs" color="subdued">
              {retentionLabel}
            </EuiText>
            <EuiText size="m">
              <RetentionDisplay definition={definition} />
            </EuiText>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={9}>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiFlexGroup>
            <StatItem
              label={documentCountLabel}
              value={
                <PrivilegesWarningIconWrapper
                  hasPrivileges={definition.privileges.monitor}
                  title="totalDocCount"
                >
                  {dataStreamStats ? formatNumber(dataStreamStats.totalDocs || 0, 'decimal0') : '-'}
                </PrivilegesWarningIconWrapper>
              }
            />
            <StatItem
              label={storageSizeLabel}
              value={
                <PrivilegesWarningIconWrapper
                  hasPrivileges={definition.privileges.monitor}
                  title="sizeBytes"
                >
                  {dataStreamStats && dataStreamStats.sizeBytes
                    ? formatBytes(dataStreamStats.sizeBytes)
                    : '-'}
                </PrivilegesWarningIconWrapper>
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
                          'Approximate average (stream total size divided by the number of days since creation).',
                      }
                    )}
                    position="right"
                  />
                </>
              }
              value={
                <PrivilegesWarningIconWrapper
                  hasPrivileges={definition.privileges.monitor}
                  title="ingestionRate"
                >
                  {dataStreamStats
                    ? formatIngestionRate(dataStreamStats.bytesPerDay || 0, true)
                    : '-'}
                </PrivilegesWarningIconWrapper>
              }
              withBorder
            />
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
