/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
import { IngestStreamGetResponse, IngestStreamLifecycleILM } from '@kbn/streams-schema';
import { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';

import { LocatorPublic } from '@kbn/share-plugin/public';
import { IlmLink } from '../../data_management/stream_detail_lifecycle/ilm_link';
import {
  formatBytes,
  formatIngestionRate,
} from '../../data_management/stream_detail_lifecycle/helpers/format_bytes';

interface StreamStatsPanelProps {
  definition?: IngestStreamGetResponse;
  dataStreamStats?: {
    totalDocs?: number;
    sizeBytes?: number;
    bytesPerDay?: number;
  };
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
}

// Component to display retention information
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

// Component for individual stat items
interface StatItemProps {
  label: string;
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
        <EuiText size="m">{value}</EuiText>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

function formatNumber(val: number) {
  return Number(val).toLocaleString('en', {
    maximumFractionDigits: 1,
  });
}

export function StreamStatsPanel({
  definition,
  dataStreamStats,
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
              value={dataStreamStats ? formatNumber(dataStreamStats.totalDocs || 0) : '-'}
            />
            <StatItem
              label={storageSizeLabel}
              value={dataStreamStats ? formatBytes(dataStreamStats.sizeBytes || 0) : '-'}
              withBorder
            />
            <StatItem
              label={ingestionLabel}
              value={dataStreamStats ? formatIngestionRate(dataStreamStats.bytesPerDay || 0) : '-'}
              withBorder
            />
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
